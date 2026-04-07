import type { DateInput, EventInput } from "@fullcalendar/core/index.js";

export function DaylogModal({
    event,
    dateRange,
    isOpen,
    onClose
}: {
    event: EventInput | null,
    dateRange: { start: DateInput, end: DateInput | null } | null,
    isOpen: boolean,
    onClose: () => void
}) {
    if (!isOpen) {
        return null;
    }

    function displayDate(date: DateInput) {
        if (date == null) {
            return "";
        }
        return new Date(date.toString()).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    return (
        <div className="ui-modal-backdrop"
            role="presentation"
            onMouseDown={onClose}>
            <div className="ui-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="daylog-modal-title"
                onMouseDown={(e) => e.stopPropagation()}>
                <h2>Event Details</h2>
                {
                    event != null && (
                        <p>{event?.title}</p>
                    )
                }
                {
                    dateRange != null && dateRange.end != null && (
                        <p>Date: {displayDate(dateRange.start)} - {displayDate(dateRange.end)}</p>
                    )
                }
                {
                    dateRange != null && dateRange.end == null && (
                        <p>Date: {displayDate(dateRange.start)}</p>
                    )
                }
                <div className="ui-btn-group ui-modal__actions">
                    <button type="button"
                        className="ui-btn"
                        onClick={onClose}>{event != null ? "Edit" : "Create"}</button>
                    <button type="button"
                        className="ui-btn ui-btn--primary"
                        onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}