
export const getScoreColor = (score: number) => {
  if (score >= 86) return "from-emerald-400 to-emerald-600";
  if (score >= 76) return "from-yellow-400 to-yellow-600";
  if (score >= 61) return "from-orange-400 to-orange-600";
  return "from-red-400 to-red-600";
};

export const getScoreTextColor = (score: number) => {
  if (score >= 86) return "text-emerald-700";
  if (score >= 76) return "text-yellow-700";
  if (score >= 61) return "text-orange-700";
  return "text-red-700";
};
