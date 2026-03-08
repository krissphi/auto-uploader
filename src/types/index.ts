import * as React from "react";

export type LogEntry = {
  id: number;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  time: string;
};

export type VideoEntry = {
  path: string;
  title: string;
};

export type Platform = {
  id: string;
  name: string;
  icon: React.ReactNode;
};
