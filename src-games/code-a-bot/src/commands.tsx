import { ArrowUp, RotateCcw, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CommandType } from './types'

interface CommandMeta {
  label: string
  icon: ReactNode
  /** צבעי הכפתור בפלטה ושל הצ'יפ בתור */
  buttonClass: string
  chipClass: string
}

/*
 * האייקונים של הפניות מייצגים סיבוב פיזי של הרובוט (עם/נגד כיוון השעון),
 * לא כיוון קריאה — ולכן בכוונה לא מקבלים היפוך rtl:-scale-x-100.
 */
export const COMMAND_META: Record<CommandType, CommandMeta> = {
  forward: {
    label: 'קדימה',
    icon: <ArrowUp strokeWidth={3} />,
    buttonClass: 'bg-sky-500 hover:bg-sky-400 shadow-sky-600/40',
    chipClass: 'bg-sky-500',
  },
  turnLeft: {
    label: 'פנייה שמאלה',
    icon: <RotateCcw strokeWidth={3} />,
    buttonClass: 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/40',
    chipClass: 'bg-amber-400',
  },
  turnRight: {
    label: 'פנייה ימינה',
    icon: <RotateCw strokeWidth={3} />,
    buttonClass: 'bg-fuchsia-500 hover:bg-fuchsia-400 shadow-fuchsia-600/40',
    chipClass: 'bg-fuchsia-500',
  },
}

export const PALETTE_ORDER: CommandType[] = ['forward', 'turnLeft', 'turnRight']
