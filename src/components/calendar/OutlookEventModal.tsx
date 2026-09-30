import React from 'react';
import { OutlookEvent } from '../../types';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Users,
  ExternalLink,
  Mail,
} from 'lucide-react';

interface OutlookEventModalProps {
  event: OutlookEvent | null;
  onClose: () => void;
}

export const OutlookEventModal: React.FC<OutlookEventModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const sTime = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const eTime = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${sTime} - ${eTime}`;
    } catch {
      return `${startIso.slice(11, 16)} - ${endIso.slice(11, 16)}`;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  let attendees: Array<{ name: string; email: string }> = [];
  if (event.attendees_json) {
    try {
      attendees = JSON.parse(event.attendees_json);
    } catch (e) {
      attendees = [];
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 mt-0.5 border border-blue-200 dark:border-blue-800">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Outlook 365 Event
                </span>
                {event.meeting_link && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Online Meeting
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                {event.subject}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-300">
          {/* Schedule & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Date</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {formatDate(event.start_date)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Time</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                  {event.is_all_day ? 'All Day Event' : formatTimeRange(event.start_time, event.end_time)}
                </div>
              </div>
            </div>
          </div>

          {/* Location / Meeting Link */}
          {event.location && (
            <div className="flex items-start space-x-2.5 text-xs">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Location: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{event.location}</span>
              </div>
            </div>
          )}

          {/* Direct Join Link */}
          {event.meeting_link && (
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-blue-900 dark:text-blue-300">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="font-bold text-xs">Microsoft Teams / Online Meeting</div>
                  <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 truncate max-w-[260px]">
                    {event.meeting_link}
                  </div>
                </div>
              </div>
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <span>Join Meeting</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Organizer */}
          {event.organizer_name && (
            <div className="flex items-center space-x-2.5 text-xs">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Organizer: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {event.organizer_name}
                </span>
                {event.organizer_email && (
                  <span className="text-slate-500 dark:text-slate-400 ml-1">
                    ({event.organizer_email})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Users className="w-4 h-4" />
                <span>Attendees ({attendees.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                {attendees.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{a.name || a.email}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Notes Preview */}
          {event.body_preview && (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Meeting Agenda / Preview
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto font-sans">
                {event.body_preview}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-400">
          <div>
            {event.synced_at && (
              <span>Synced {new Date(event.synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {event.web_link && (
              <a
                href={event.web_link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <span>Open in Outlook Web</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
