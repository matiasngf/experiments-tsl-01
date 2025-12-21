import { redirect } from "next/navigation";
import experiments from "../../experiments.json";

export default function Home() {
  const firstExperiment = experiments[0];

  if (firstExperiment) {
    redirect(firstExperiment.url);
  }

  return null;
}
