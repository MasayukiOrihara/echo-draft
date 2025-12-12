/** 区切り書き起こしを管理する型 */
export type SegmentText = {
  index: number;
  text: string;
  startMs?: number; // 開始時刻（ミリ秒）
  speaker?: string; // 話者
};

/** 要約の入力型 */
export type SummaryRequest = {
  segments: SegmentText[];
  title?: string;
};

/** 要約の出力型 */
export type SummaryResponse = {
  summary: string;
};

/** トピックの入力型 */
export type TopicRequest = {
  segments: {
    index: number;
    text: string;
  }[];
  title?: string;
};

/** トピックの出力型 */
export type TopicResponse = {
  topics: string[];
};

/** 話者特定の入力型 */
export type SpeakerLabelRequest = {
  lines: string[];
  title?: string;
};

/** 話者特定の出力型 */
export type SpeakerLabelResponse = {
  segments: SegmentText[];
};
