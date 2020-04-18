import React from 'react';
import ChartComponent from 'react-chartjs-2';

const RatingChart = ({ title, ratings }) => {
  const options = {
    title: {
      display: true,
      text: title,
      fontSize: 20
    },
    scales: {
      xAxes: [
        {
          type: 'time',
          time: {
            unit: 'month'
          }
        }
      ],
      yAxes: [
        {
          display: true,
          ticks: {
            suggestedMin: 0
          }
        }
      ]
    },
    legend: {
      display: false
    }
  };

  const data = {
    datasets: [
      {
        data: ratings,
        fill: false,
        pointRadius: 5,
        borderColor: '#F0E442',
        lineTension: 0
      }
    ]
  };

  return (
    <div className='chart'>
      <ChartComponent type='line' data={data} options={options} />
    </div>
  );
};

export default RatingChart;
