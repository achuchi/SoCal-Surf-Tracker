import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TempTrendsChart = ({ data }) => {
  if (!data) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-slate-500">Loading temperature data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data.timeSeries || !data.timeSeries.dataPoints) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-red-500">No temperature data available</div>
        </CardContent>
      </Card>
    );
  }

  const { timeSeries, current } = data;
  const { statistics, trend, dataPoints } = timeSeries;

  const TrendIcon = trend.trendDirection === 'increasing' 
  ? TrendingUp 
  : trend.trendDirection === 'decreasing' 
    ? TrendingDown 
    : Minus;

  const getTemperatureColor = (temp) => {
    const minTemp = 13;
    const maxTemp = 16;
    const normalizedTemp = (temp - minTemp) / (maxTemp - minTemp);
    const hue = 240 - (normalizedTemp * 200); // 240 (blue) to 40 (orange)
    return `hsl(${hue}, 70%, 50%)`;
  };

  const formattedData = dataPoints
    .map(point => {
      const pointTime = new Date(point.timestamp);
      const hoursAgo = Math.round((new Date() - pointTime) / (1000 * 60 * 60));
      
      return {
        ...point,
        time: `${pointTime.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`,
        hoursAgo: hoursAgo,
        value: Number(point.value),
        fill: getTemperatureColor(point.value)
      };
    })
    .sort((a, b) => a.hoursAgo - b.hoursAgo);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Water Temperature History</CardTitle>
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
            <div className="text-base font-bold text-sky-700">{statistics.average.toFixed(1)}°F</div>
          </div>
          <div className="bg-sky-50 p-2 rounded-lg">
            <div className="text-xs text-sky-600">Min</div>
            <div className="text-base font-bold text-sky-700">{statistics.minimum.toFixed(1)}°F</div>
          </div>
          <div className="bg-sky-50 p-2 rounded-lg">
            <div className="text-xs text-sky-600">Max</div>
            <div className="text-base font-bold text-sky-700">{statistics.maximum.toFixed(1)}°F</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={formattedData}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis 
                dataKey="time"
                className="text-xs"
                height={30}
                angle={-45}
                textAnchor="end"
                interval="preserveEnd"
                minTickGap={10}
              />
              <YAxis 
                className="text-xs"
                domain={[13, 16]}
                unit="°F"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [`${value.toFixed(1)}°F`, 'Temperature']}
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
              <Bar 
                dataKey="value"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
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

export default TempTrendsChart;