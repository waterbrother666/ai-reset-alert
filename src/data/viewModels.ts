export type Category =
  | 'reset_upcoming'
  | 'reset_released'
  | 'reset_announced'
  | 'reset_credit_announced'
  | 'reset_credit_released'

export type NotifyState = 'notified' | 'not_notified' | 'not_applicable'

export interface SignalRecord {
  id: string
  category: Category
  claim: string
  body: string
  originalText: string
  publishedAt: number
  notify: NotifyState
  url: string
  related: true
  status: 'announced' | 'confirmed'
  eventType: 'direct_reset' | 'reset_credit'
}

export interface DayActivity {
  date: number
  count: number
  released: boolean
}

export const CATEGORY_LABELS: Record<Category, string> = {
  reset_upcoming: '即将重置',
  reset_released: '重置已确认',
  reset_announced: '已预告重置',
  reset_credit_announced: '重置卡预告',
  reset_credit_released: '重置卡已确认',
}

export const CATEGORY_HINTS: Record<Category, string> = {
  reset_upcoming: 'Tibo 已给出仍在未来的预计重置时间',
  reset_released: '已有来源帖子确认额度重置完成',
  reset_announced: '已经宣布重置，但没有仍在未来的明确时间',
  reset_credit_announced: '已经宣布将发放可保存的重置卡',
  reset_credit_released: '重置卡发放已有来源或回执确认',
}
