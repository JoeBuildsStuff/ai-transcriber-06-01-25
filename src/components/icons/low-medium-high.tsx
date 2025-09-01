interface LowMediumHighIconProps {
  level?: 1 | 2 | 3; // Made level optional
}

export const LowMediumHighIcon: React.FC<LowMediumHighIconProps> = ({ level = 1 }) => { // Default to 1
  return (
    <div className="flex items-end gap-0.5 ">
      <div className={`w-1 h-1 rounded-xs ${level >= 1 ? 'bg-muted-foreground' : 'bg-transparent border border-muted-foreground'}`}/>
      <div className={`w-1 h-2 rounded-xs ${level >= 2 ? 'bg-muted-foreground' : 'bg-transparent border border-muted-foreground'}`}/>
      <div className={`w-1 h-3 rounded-xs ${level >= 3 ? 'bg-muted-foreground' : 'bg-transparent border border-muted-foreground'}`}/>
    </div>
  )
}