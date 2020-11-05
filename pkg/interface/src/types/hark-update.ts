import _ from "lodash";
import { Post } from "./graph-update";
import { GroupUpdate } from "./group-update";
import { BigIntOrderedMap } from "~/logic/lib/BigIntOrderedMap";
import { Envelope } from './chat-update';

type GraphNotifDescription = "link" | "comment";

export interface GraphNotifIndex {
  graph: string;
  group: string;
  description: GraphNotifDescription;
  module: string;
}

export interface GroupNotifIndex {
  group: string;
  description: string;
}

export type ChatNotifIndex = string;

export type NotifIndex =
  | { graph: GraphNotifIndex }
  | { group: GroupNotifIndex }
  | { chat: ChatNotifIndex };

export type GraphNotificationContents = Post[];

export type GroupNotificationContents = GroupUpdate[];

export type ChatNotificationContents = Envelope[];

export type NotificationContents =
  | { graph: GraphNotificationContents }
  | { group: GroupNotificationContents }
  | { chat: ChatNotificationContents };

interface Notification {
  read: boolean;
  time: number;
  contents: NotificationContents;
}

export interface IndexedNotification {
  index: NotifIndex;
  notification: Notification;
}

export type Timebox = IndexedNotification[];

export type Notifications = BigIntOrderedMap<Timebox>;

export interface NotificationGraphConfig {
  watchOnSelf: boolean;
  mentions: boolean;
  watching: string[];
}

export type GroupNotificationsConfig = string[];