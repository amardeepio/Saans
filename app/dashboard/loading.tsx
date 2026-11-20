export default function DashboardLoading() {
  return (
    <div className="dashboard-shell" aria-busy="true" aria-label="Loading the India air dashboard">
      <div className="dashboard-loading-shell">
        <span className="eyebrow">India city scan</span>
        <h1>Reading the air across India.</h1>
        <div className="dashboard-loading-grid">
          <div className="loading-block loading-block--tall" />
          <div className="loading-block loading-block--wide" />
        </div>
      </div>
    </div>
  );
}
