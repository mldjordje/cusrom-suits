// components/FinishButton.tsx
import React from "react";
import { SuitState } from "../hooks/useSuitConfigurator";

type Props = {
  config: SuitState;
};

const FinishButton: React.FC<Props> = ({ config }) => {
  const handleClick = () => {
    const json = JSON.stringify(config);
    const url = new URL(window.location.origin + "/custom-suits/measure");
    url.searchParams.set("config", json);
    window.location.href = url.toString();
  };

  return (
    <button
      onClick={handleClick}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Continue to Measurements
    </button>
  );
};

export default FinishButton;
