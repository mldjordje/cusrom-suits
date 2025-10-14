// components/FinishButton.tsx
import React from "react";
import { SuitState } from "../hooks/useSuitConfigurator";

type Props = {
  config: SuitState;
};

const FinishButton: React.FC<Props> = ({ config }) => {
  const handleClick = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    alert("Configuration copied to clipboard:\n" + json);
  };

  return (
    <button
      onClick={handleClick}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Send Config
    </button>
  );
};

export default FinishButton;
