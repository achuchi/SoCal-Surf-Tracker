import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const WaveTrendsChart = ({ data }) => {
  // Early return with loading state if no data
  if (!data) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-slate-500">Loading trend data...</div>
        </CardContent>
      </Card>
    );
  }

  // Early return with error state if invalid data structure
  if (!data.timeSeries || !data.timeSeries.dataPoints) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-red-500">No trend data available</div>
        </CardContent>
      </Card>
    );
  }

  const { timeSeries, current } = data;
  const { statistics, trend, dataPoints } = timeSeries;

  // Format timestamp for display
  const formattedData = dataPoints.map(point => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }));

  // Determine trend icon
  const TrendIcon = trend.trendDirection === 'increasing' 
    ? TrendingUp 
    : trend.trendDirection === 'decreasing' 
      ? TrendingDown 
      : Minus;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Wave Height Trends</CardTitle>
          <div className="flex items-center gap-2">
            <TrendIcon 
              className={`w-4 h-4 ${
                trend.trendDirection === 'increasing' 
                  ? 'text-green-500' 
                  : trend.trendDirection === 'decreasing' 
                    ? 'text-red-500' 
                    : 'text-gray-500'
              }`}
            />
            <span className="text-sm">
              {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-sky-50 p-2 rounded-lg">
            <div className="text-xs text-sky-600">Average</div>
            <div className="text-base font-bold text-sky-700">{statistics.average.toFixed(1)}ft</div>
          </div>
          <div className="bg-sky-50 p-2 rounded-lg">
            <div className="text-xs text-sky-600">Min</div>
            <div className="text-base font-bold text-sky-700">{statistics.minimum.toFixed(1)}ft</div>
          </div>
          <div className="bg-sky-50 p-2 rounded-lg">
            <div className="text-xs text-sky-600">Max</div>
            <div className="text-base font-bold text-sky-700">{statistics.maximum.toFixed(1)}ft</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                interval="preserveStartEnd"
              />
              <YAxis 
                className="text-xs"
                domain={[
                  Math.floor(statistics.minimum * 0.8),
                  Math.ceil(statistics.maximum * 1.2)
                ]}
                unit="ft"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ color: '#666' }}
              />
              <ReferenceLine 
                y={statistics.average} 
                stroke="#666" 
                strokeDasharray="3 3"
                label={{ 
                  value: 'Avg', 
                  position: 'right',
                  className: 'text-xs fill-gray-500' 
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Score */}
        <div className="text-xs text-gray-500 text-center">
          Trend Confidence: {(trend.confidenceScore * 100).toFixed(0)}%
        </div>
      </CardContent>
    </Card>
  );
};

export default WaveTrendsChart;