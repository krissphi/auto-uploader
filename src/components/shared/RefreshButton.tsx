import { Button } from "./Button";
import { RefreshIcon } from "./Icons";

interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  isRefreshing: boolean;
  disabled?: boolean;
  title?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const RefreshButton = ({ 
  onClick, 
  isRefreshing, 
  disabled,
  title = "Refresh", 
  size = 20,
  className = "",
  style = {}
}: RefreshButtonProps) => {
  return (
    <Button
      title={title}
      onClick={onClick}
      disabled={disabled !== undefined ? disabled : isRefreshing}
      variant="outline"
      className={className}
      style={{ 
          width: '48px', 
          height: '48px', 
          padding: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 0,
          ...style
      }}
    >
      <RefreshIcon isRotating={isRefreshing} size={size} />
    </Button>
  );
};
