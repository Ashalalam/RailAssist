import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { useJourneys } from '../contexts/JourneyContext';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  const { journeys, loading } = useJourneys();
  const { user } = useAuth();

  const { averageDelay, totalKm, monthlyChartData, distributionChartData } = useMemo(() => {
    if (journeys.length === 0) {
      return {
        averageDelay: 0,
        totalKm: 0,
        monthlyChartData: { options: {}, series: [] },
        distributionChartData: { options: {}, series: [] }
      };
    }

    // 1. Calculate general stats
    const delays = journeys.map(j => j.delayMinutes || 0);
    const avgDelay = delays.length > 0 ? (delays.reduce((s, v) => s + v, 0) / delays.length) : 0;
    const kmSum = journeys.reduce((sum, j) => sum + (j.distanceKm || 0), 0);

    // 2. Process Monthly TA/NDA stats (last 6 months)
    const monthMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().substring(0, 7); // "YYYY-MM"
      monthMap[mStr] = { ta: 0, nda: 0, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) };
    }

    journeys.forEach(j => {
      const depDate = new Date(j.scheduledDeparture);
      const mStr = depDate.toISOString().substring(0, 7);
      if (monthMap[mStr]) {
        monthMap[mStr].ta += j.taAmount || 0;
        monthMap[mStr].nda += j.ndaAmount || 0;
      }
    });

    const months = Object.keys(monthMap).sort();
    const categories = months.map(m => monthMap[m].label);
    const taSeries = months.map(m => monthMap[m].ta);
    const ndaSeries = months.map(m => monthMap[m].nda);

    const monthlyChart = {
      series: [
        { name: 'Traveling Allowance (TA)', data: taSeries },
        { name: 'Night Duty Allowance (NDA)', data: ndaSeries }
      ],
      options: {
        chart: {
          type: 'bar',
          stacked: true,
          toolbar: { show: false },
          background: 'transparent',
          fontFamily: 'Inter, sans-serif'
        },
        colors: ['#6366F1', '#10B981'],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 4,
            columnWidth: '40%'
          }
        },
        xaxis: {
          categories: categories,
          labels: { style: { colors: '#94A3B8', fontSize: '11px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: { 
            style: { colors: '#94A3B8', fontSize: '11px' },
            formatter: (val) => `₹${val}`
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'center',
          labels: { colors: '#F8FAFC' },
          fontFamily: 'Inter, sans-serif'
        },
        grid: {
          borderColor: 'rgba(255, 255, 255, 0.04)',
          strokeDashArray: 3
        },
        tooltip: {
          theme: 'dark'
        }
      }
    };

    // 3. Process TA vs NDA Pie Chart distribution
    const totalTA = journeys.reduce((sum, j) => sum + (j.taAmount || 0), 0);
    const totalNDA = journeys.reduce((sum, j) => sum + (j.ndaAmount || 0), 0);

    const distributionChart = {
      series: [totalTA || 1, totalNDA || 1],
      options: {
        chart: {
          type: 'donut',
          background: 'transparent',
          fontFamily: 'Inter, sans-serif'
        },
        labels: ['Total TA Claim', 'Total NDA Claim'],
        colors: ['#6366F1', '#10B981'],
        stroke: { show: false },
        legend: {
          position: 'bottom',
          labels: { colors: '#94A3B8', fontSize: '11px' },
          fontFamily: 'Inter, sans-serif'
        },
        dataLabels: {
          enabled: true,
          style: { fontSize: '11px', fontFamily: 'Inter, sans-serif' },
          formatter: function (val) {
            return val.toFixed(1) + "%";
          }
        },
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Allowances',
                  formatter: () => `₹${totalTA + totalNDA}`,
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600'
                },
                value: {
                  color: '#94A3B8',
                  fontSize: '16px',
                  formatter: (val) => `₹${val}`
                }
              }
            }
          }
        },
        tooltip: {
          theme: 'dark'
        }
      }
    };

    return {
      averageDelay: parseFloat(avgDelay.toFixed(1)),
      totalKm: kmSum,
      monthlyChartData: monthlyChart,
      distributionChartData: distributionChart
    };
  }, [journeys]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="mb-4">
          <div className="skeleton skeleton-title" style={{ width: '30%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
        </div>

        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="col-12 col-sm-6 col-md-3">
              <div className="card-saas p-3 text-center">
                <div className="skeleton skeleton-text mx-auto" style={{ width: '60%' }}></div>
                <div className="skeleton skeleton-title mx-auto mt-2" style={{ width: '40%', height: '24px' }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="card-saas">
              <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
              <div className="skeleton skeleton-rect" style={{ height: '320px' }}></div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="card-saas">
              <div className="skeleton skeleton-title" style={{ width: '50%' }}></div>
              <div className="skeleton skeleton-rect" style={{ height: '320px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-white mb-1">Performance Overview</h2>
        <p className="text-secondary-custom">Breakdown and analytics of logged shift duties and claim items</p>
      </div>

      {journeys.length === 0 ? (
        <div className="card-saas text-center py-5 d-flex flex-column align-items-center justify-content-center">
          <BarChart3 size={48} className="text-secondary-custom mb-3" />
          <h5 className="text-white mb-1" style={{ fontSize: '16px' }}>No Performance Data Found</h5>
          <p className="text-secondary-custom small mb-0" style={{ maxWidth: '320px' }}>Log your shift duties on the logger page to populate performance graphs.</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-md-3">
              <div className="card-saas p-3 text-center">
                <span className="text-secondary-custom small d-block">Total Distance Covered</span>
                <div className="widget-stat-number fs-3">{totalKm} km</div>
                <small className="text-secondary-custom">Cumulative route mileage</small>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <div className="card-saas p-3 text-center">
                <span className="text-secondary-custom small d-block">Average Arrival Delay</span>
                <div className="widget-stat-number fs-3">{averageDelay} mins</div>
                <small className="text-secondary-custom">Minutes behind timetable</small>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <div className="card-saas p-3 text-center">
                <span className="text-secondary-custom small d-block">Duties Completed</span>
                <div className="widget-stat-number fs-3">{journeys.length}</div>
                <small className="text-secondary-custom">Roster duty entries active</small>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <div className="card-saas p-3 text-center">
                <span className="text-secondary-custom small d-block">Account Profile Tier</span>
                <div className="widget-stat-number fs-3 text-primary">{user?.subscriptionTier || 'Free'}</div>
                <small className="text-secondary-custom">Authorized License Tier</small>
              </div>
            </div>
          </div>

          {/* Chart Layouts */}
          <div className="row g-3">
            {/* Monthly Bar Chart */}
            <div className="col-12 col-lg-8">
              <div className="card-saas">
                <h5 className="text-white mb-4" style={{ fontSize: '15px', fontWeight: '600' }}>Monthly Allowance Claim Breakdown</h5>
                {monthlyChartData.series.length > 0 ? (
                  <Chart 
                    options={monthlyChartData.options} 
                    series={monthlyChartData.series} 
                    type="bar" 
                    height="320" 
                  />
                ) : (
                  <div className="text-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    <span>Assembling monthly records...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pie Distribution Chart */}
            <div className="col-12 col-lg-4">
              <div className="card-saas h-100">
                <h5 className="text-white mb-4" style={{ fontSize: '15px', fontWeight: '600' }}>Allowance Allocation Share</h5>
                {distributionChartData.series.length > 0 ? (
                  <div style={{ minHeight: '300px' }} className="d-flex align-items-center justify-content-center">
                    <Chart 
                      options={distributionChartData.options} 
                      series={distributionChartData.series} 
                      type="donut" 
                      width="100%" 
                    />
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    <span>Formatting share donut...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
