import { LucideIcon } from "lucide-react";

interface ActivityItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
}

const ActivityItem = ({ icon: Icon, title, description, time }: ActivityItemProps) => {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent transition-colors duration-200">
      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
    </div>
  );
};

export default ActivityItem;
