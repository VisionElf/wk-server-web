import { DisplayWeightsChart } from "../components/weightsComponent.tsx";

export default function HealthHomePage() {
  return (
    <div className="app-page">
      <h1>Health Home</h1>
      <p>This is the health home page.</p>
      <DisplayWeightsChart />
    </div>
  );
}
