import { useState, useMemo } from 'react';
import { useTriviaData, type Question, type QuestionDifficulty } from './useTriviaData'; // Import the hook and types
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  CssBaseline,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ClearIcon from '@mui/icons-material/Clear';

// Chart colors
const DIFFICULTY_COLORS: Record<QuestionDifficulty, string> = { 
  easy: '#00C49F', 
  medium: '#FFBB28', 
  hard: '#FF8042' 
};
const CATEGORY_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE',
  '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#D0ED57'
];

// Data type for pie chart data
interface PieData {
  name: string;
  count: number;
}

// Reusable chart data shape used by various chart inputs
interface ChartDataInput {
  name: string;
  count: number;
  [key: string]: unknown; // allow extra keys so this matches Recharts' expected data shape
}

function App() {
  const theme = createTheme({
    palette: {
      primary: {
        main: '#1976d2',
      },
      background: {
        default: '#f5f7fb'
      }
    },
    components: {
      MuiCard: {
        defaultProps: {
          elevation: 3
        }
      }
    }
  });
  // Get data by calling the custom hook
  const { questions, categories, loading, error } = useTriviaData(80);
  
  // State for the filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Memoize derived data based on the filter
  const filteredQuestions: Question[] = useMemo(() => {
    if (selectedCategory === 'All') {
      return questions;
    }
    return questions.filter(q => q.category === selectedCategory);
  }, [questions, selectedCategory]);

  const categoryDistribution: PieData[] = useMemo(() => {
    if (selectedCategory !== 'All') return []; // Only show for "All"
    
    const counts = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort descending
  }, [questions, selectedCategory]);

  const difficultyDistribution: ChartDataInput[] = useMemo(() => {
    const counts = filteredQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, { easy: 0, medium: 0, hard: 0 } as Record<QuestionDifficulty, number>);

    return [
      { name: 'Easy', count: counts.easy },
      { name: 'Medium', count: counts.medium },
      { name: 'Hard', count: counts.hard },
    ].filter(d => d.count > 0);
  }, [filteredQuestions]);

  
  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Please wait while loading Trivia Data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Alert severity="error">Error: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Open Trivia Dashboard
        </Typography>
        <Typography color="text.secondary">Visualizing {questions.length} sample questions</Typography>
      </Box>

      <ThemeProvider theme={theme}>
      <CssBaseline />
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="category-filter-label">Filter by Category</InputLabel>
                <Select
                  labelId="category-filter-label"
                  id="category-filter"
                  value={selectedCategory}
                  label="Filter by Category"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => setSelectedCategory(e.target.value as string)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {categories.slice(1).map((category) => (
                  <Tooltip key={category} title={`Filter by ${category}`}>
                    <Chip
                      label={category}
                      clickable
                      onClick={() => setSelectedCategory(category)}
                      color={selectedCategory === category ? 'primary' : 'default'}
                      variant={selectedCategory === category ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                ))}
                <Box sx={{ ml: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<ClearIcon />} onClick={() => setSelectedCategory('All')}>
                    Reset
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom align="center">
                Question Difficulty{selectedCategory !== 'All' ? ` (in ${selectedCategory})` : ''}
              </Typography>
              {filteredQuestions.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={difficultyDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {difficultyDistribution.map((entry) => {
                        const e = entry as { name: string; count: number };
                        return (
                          <Cell key={`cell-${e.name}`} fill={DIFFICULTY_COLORS[e.name.toLowerCase() as QuestionDifficulty]} />
                        );
                      })}
                    </Pie>
                    <RechartsTooltip formatter={(value: number, name: string) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography align="center">No questions found.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedCategory === 'All' ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom align="center">Questions by Category</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={categoryDistribution}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="Questions">
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Questions for {selectedCategory}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>Showing {filteredQuestions.length} question(s).</Typography>
                <Box component="ul" sx={{ pl: 2, maxHeight: 260, overflowY: 'auto' }}>
                  {filteredQuestions.map((q, index) => (
                    <li key={index} style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: DIFFICULTY_COLORS[q.difficulty] }}>({q.difficulty})</span> {q.question}
                    </li>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      </ThemeProvider>
    </Container>
  );
}

export default App;

