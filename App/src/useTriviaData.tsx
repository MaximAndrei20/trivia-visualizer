import { useState, useEffect, useMemo } from 'react';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

/**
 * The raw question object received from the API.
 */
interface ApiResult {
  category: string;
  type: string;
  difficulty: QuestionDifficulty;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

/**
 * The shape of the entire API response.
 */
interface ApiResponse {
  response_code: number;
  results: ApiResult[];
}

/**
 * The processed Question object used within the application.
 */
export type Question = ApiResult

/**
 * The return type for our custom hook.
 */
interface UseTriviaDataReturn {
  questions: Question[];
  categories: string[];
  loading: boolean;
  error: string | null;
}


/**
 * Helper function to decode HTML entities (e.g., &quot; -> ")
 */
function decodeHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent || html;
  } catch (e) {
    console.error("Error decoding HTML:", e);
    return html; // Fallback
  }
}

/**
 * Waits for a specified number of milliseconds.
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A custom hook to fetch and process trivia data from the Open Trivia API.
 * @param {number} totalAmount - The total number of questions to fetch.
 */
export function useTriviaData(totalAmount: number = 50): UseTriviaDataReturn {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const CACHE_KEY = `triviaDataCache_${totalAmount}`;
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchData() {
      // 1. Check for cached data first
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData) as Question[];
          if (parsedData.length > 0) {
            setQuestions(parsedData);
            setLoading(false);
            return; // Stop here, don't fetch
          }
        } catch (e) {
          console.error("Failed to parse cache, fetching new data.", e);
          sessionStorage.removeItem(CACHE_KEY); // Clear bad cache
        }
      }

      // 2. If no cache, fetch new data
      setLoading(true);
      setError(null);
      
      const allFetchedQuestions: Question[] = [];
      // Calculate how many requests we need to make
      const numRequests = Math.ceil(totalAmount / 50);

      try {
        for (let i = 0; i < numRequests; i++) {
          // Determine how many questions to get in this specific batch
          // (Usually 50, but the last request might be for less)
          const amountInThisRequest = (i === numRequests - 1 && totalAmount % 50 !== 0) 
            ? totalAmount % 50 
            : 50;

          const response = await fetch(
            `https://opentdb.com/api.php?amount=${amountInThisRequest}`, 
            { signal }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = (await response.json()) as ApiResponse;
          
          if (data.response_code !== 0) {
            throw new Error(`Trivia API Error Code: ${data.response_code}`);
          }
          
          const decodedQuestions: Question[] = data.results.map(q => ({
            ...q,
            category: decodeHtml(q.category),
            question: decodeHtml(q.question),
            correct_answer: decodeHtml(q.correct_answer), // Typo fixed
            incorrect_answers: q.incorrect_answers.map(decodeHtml),
          }));
          
          allFetchedQuestions.push(...decodedQuestions);

          // If this isn't the last request, wait 5 seconds for the rate limit
          if (i < numRequests - 1) {
            if (signal.aborted) throw new Error('AbortError');
            await wait(5000); // Wait 5 seconds
          }
        }
        
        // Save the complete stitched list to cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(allFetchedQuestions));
        setQuestions(allFetchedQuestions);

      } catch (e) {
        if (e instanceof Error) {
          if (e.name === 'AbortError') {
            console.log('Fetch aborted');
          } else {
            console.error("Failed to fetch trivia data:", e);
            setError(e.message);
          }
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    // Cleanup function
    return () => {
      controller.abort();
    };
  }, [totalAmount]); // Re-fetch if the totalAmount changes

  // Memoize categories
  const categories: string[] = useMemo(() => {
    const categorySet = new Set(questions.map(q => q.category));
    return ['All', ...Array.from(categorySet).sort()];
  }, [questions]);

  // Return all data
  return { questions, categories, loading, error };
}

