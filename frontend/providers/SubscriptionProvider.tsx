import { createContext, ReactNode, useState } from "react";

export enum Plan {
  FreeTrial = "free trial",
  ShortTrip = "Short Trip",
  LongTrip = "Long Trip",
  AnnualTrip = "Annual Trip",
}

type SubscriptionType = {
  isActive: boolean;
  plan: Plan;
  choose: (plan: Plan) => void;
};

const SubscriptionContext = createContext<SubscriptionType | undefined>(
  undefined,
);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);

  const [plan, setPlan] = useState<Plan>(Plan.FreeTrial);

  function choose(selectedPlan: Plan) {
    setPlan(selectedPlan);
    setIsActive(true);
  }

  return (
    <SubscriptionContext.Provider value={{ isActive, plan, choose }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
