export const calculateHealthScore = (metrics) => {
  if (!metrics || metrics.length === 0) return 0;
  const sum = metrics.reduce((acc, curr) => acc + (curr.value || 0), 0);
  return Math.round(sum / metrics.length);
};

export const calculateCostTrend = (current, previous) => {
  if (!previous) return 0;
  return (((current - previous) / previous) * 100).toFixed(1);
};

export const calculateTotalSavings = (initiatives) => {
  return initiatives.reduce((acc, curr) => acc + (curr.savings_amount || 0), 0);
};