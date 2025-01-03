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

  const formattedData = dataPoints
    .map(point => {
      const pointTime = new Date(point.timestamp);
      const hoursAgo = Math.round((new Date() - pointTime) / (1000 * 60 * 60));
      
      return {
        ...point,
        time: `${hoursAgo}h ago`,
        rawTime: pointTime,
        value: Number(point.value)
      };
    })
    .sort((a, b) => a.rawTime - b.rawTime);

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

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={formattedData}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis 
                dataKey="time" 
                className="text-xs"
                height={30}
                angle={0}
                interval="preserveEnd"
                minTickGap={40}
              />
              <YAxis 
                className="text-xs"
                domain={[
                  Math.floor(statistics.minimum * 0.8),
                  Math.ceil(statistics.maximum * 1.2)
                ]}
                unit="ft"
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ color: '#666' }}
                formatter={(value, name) => [`${value}ft`, 'Wave Height']}
                labelFormatter={(label) => {
                  const point = formattedData.find(p => p.time === label);
                  return point ? new Date(point.rawTime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  }) : label;
                }}
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

        <div className="text-xs text-gray-500 text-center mt-2">
          Trend Confidence: {(trend.confidenceScore * 100).toFixed(0)}%
        </div>
      </CardContent>
    </Card>
  );
};

export default WaveTrendsChart;