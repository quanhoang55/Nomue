import { createContext, ReactNode, useContext, useState } from "react";

export enum Plan {
  FreeTrial = "free trial",
  ShortTrip = "Short Trip",
  LongTrip = "Long Trip",
  AnnualTrip = "Annual Trip",
}

type SubscriptionType = {
  isActive: boolean;
  plan: Plan | null;
  choose: (plan: Plan) => void;
};

const SubscriptionContext = createContext<SubscriptionType | undefined>(
  undefined,
);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);

  const [plan, setPlan] = useState<Plan | null>(null);

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

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "[ERROR!] useSubscription must be used within SubscriptionContext.",
    );
  }
}
