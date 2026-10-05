import React, { useState, useEffect } from 'react';
import { OutlookEvent } from '../../types';
import { api } from '../../lib/api';
import {
  X,
  Video,
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialDate?: string;
  meetingToEdit?: OutlookEvent | null;
  showToast: (msg: string) => void;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialDate,
  meetingToEdit,
  showToast,
}) => {
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('Microsoft Teams');
  const [organizerName, setOrganizerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (meetingToEdit) {
      setSubject(meetingToEdit.subject || '');
      setStartDate(meetingToEdit.start_date || '');
      setIsAllDay(Boolean(meetingToEdit.is_all_day));
      setMeetingLink(meetingToEdit.meeting_link || '');
      setLocation(meetingToEdit.location || 'Microsoft Teams');
      setOrganizerName(meetingToEdit.organizer_name || '');
      setNotes(meetingToEdit.body_preview || '');

      if (meetingToEdit.start_time) {
        const timePart = meetingToEdit.start_time.includes('T')
          ? meetingToEdit.start_time.split('T')[1].slice(0, 5)
          : meetingToEdit.start_time.slice(0, 5);
        setStartTime(timePart || '09:00');
      } else {
        setStartTime('09:00');
      }

      if (meetingToEdit.end_time) {
        const timePart = meetingToEdit.end_time.includes('T')
          ? meetingToEdit.end_time.split('T')[1].slice(0, 5)
          : meetingToEdit.end_time.slice(0, 5);
        setEndTime(timePart || '10:00');
      } else {
        setEndTime('10:00');
      }
    } else {
      setSubject('');
      setStartDate(initialDate || new Date().toISOString().slice(0, 10));
      setStartTime('09:00');
      setEndTime('10:00');
      setIsAllDay(false);
      setMeetingLink('');
      setLocation('Microsoft Teams');
      setOrganizerName('');
      setNotes('');
    }
    setShowDeleteConfirm(false);
  }, [isOpen, meetingToEdit, initialDate]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      showToast('Please enter a meeting title / subject.');
      return;
    }
    if (!startDate) {
      showToast('Please select a meeting date.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<OutlookEvent> = {
        subject: subject.trim(),
        start_date: startDate,
        end_date: startDate,
        start_time: `${startDate}T${startTime}:00`,
        end_time: `${startDate}T${endTime}:00`,
        is_all_day: isAllDay ? 1 : 0,
        meeting_link: meetingLink.trim(),
        location: location.trim() || 'Microsoft Teams',
        organizer_name: organizerName.trim() || 'Engineering Team',
        body_preview: notes.trim(),
        web_link: meetingLink.trim(),
      };

      if (meetingToEdit) {
        await api.updateMeeting(meetingToEdit.id, payload);
        showToast(`Meeting updated: "${subject.trim()}"`);
      } else {
        await api.createMeeting(payload);
        showToast(`Meeting created: "${subject.trim()}"`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      showToast(`Error saving meeting: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meetingToEdit) return;
    setIsDeleting(true);
    try {
      await api.deleteMeeting(meetingToEdit.id);
      showToast(`Meeting deleted: "${meetingToEdit.subject}"`);
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(`Error deleting meeting: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {meetingToEdit ? 'Edit MS Teams Meeting' : 'Add MS Teams Meeting'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schedule a meeting and include a Microsoft Teams link for direct 1-click joining
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Subject */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>Meeting Title / Subject</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Weekly Coordination Meeting / HAZOP Alignment"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-blue-600 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Time</span>
              </label>
              <input
                type="time"
                disabled={isAllDay}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-blue-600 outline-none disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>End Time</span>
              </label>
              <input
                type="time"
                disabled={isAllDay}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono focus:border-blue-600 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_all_day_check"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_all_day_check" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              All-day event
            </label>
          </div>

          {/* MS Teams Meeting Link */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>MS Teams Meeting Link (URL)</span>
              </span>
              {meetingLink && (
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Test link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://teams.microsoft.com/l/meetup-join/..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
            <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
              Paste the link from your Microsoft Teams calendar invite. Clicking on this meeting will allow attendees to join immediately.
            </p>
          </div>

          {/* Location / Meeting Room & Organizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Location / Room</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. MS Teams & Room 302"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:border-blue-600 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Organizer / Lead</span>
              </label>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. Nguyen Van Hai"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          {/* Agenda / Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Agenda & Meeting Notes</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key discussion points, required attendees, agenda items..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Delete confirmation section if editing */}
          {meetingToEdit && showDeleteConfirm && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 animate-in fade-in duration-100">
              <div className="font-semibold text-rose-800 dark:text-rose-200">
                Delete this meeting from calendar?
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                This will remove "{meetingToEdit.subject}" from the calendar timeline.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              {meetingToEdit && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{meetingToEdit ? 'Save Changes' : 'Create Meeting'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
