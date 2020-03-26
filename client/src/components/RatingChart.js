import React from 'react';
import { Line } from 'react-chartjs-2';

const RatingChart = ({ title, labels, data }) => {
  return (
    <div className='chart'>
      <Line
        data={{
          labels: labels,
          datasets: [
            {
              data: data,
              fill: false,
              pointRadius: 5,
              borderColor: '#F0E442',
              lineTension: 0
            }
          ]
        }}
        options={{
          title: {
            display: true,
            text: title,
            fontSize: 20
          },
          legend: {
            display: false
          }
        }}
      />
    </div>
  );
};

export default RatingChart;
