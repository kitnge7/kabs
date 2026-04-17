"use client";

import CloudReconUI from "./CloudReconUI";
import CopilotYoloUI from "./CopilotYoloUI";
import EchoLeakUI from "./EchoLeakUI";
import FreysaUI from "./FreysaUI";
import OperatorUI from "./OperatorUI";
import ReplitUI from "./ReplitUI";

interface LiveTargetProps {
  target: string;
  exploited: boolean;
}

export default function LiveTarget({ target, exploited }: LiveTargetProps) {
  switch (target) {
    case "freysa":
      return <FreysaUI exploited={exploited} />;
    case "echoleak":
      return <EchoLeakUI exploited={exploited} />;
    case "replit":
      return <ReplitUI exploited={exploited} />;
    case "claude-code":
      return <CloudReconUI exploited={exploited} />;
    case "copilot-yolo":
      return <CopilotYoloUI exploited={exploited} />;
    case "operator":
      return <OperatorUI exploited={exploited} />;
    default:
      return null;
  }
}
