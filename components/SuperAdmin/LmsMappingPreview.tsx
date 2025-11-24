/**
 * LMS Mapping Preview Component
 *
 * Shows a read-only preview of how TrackTally fields map to the selected LMS provider
 */

import {
  LMS_TEMPLATES,
  COMMENDATION_TEMPLATES,
  getDefaultFields,
  LMS_PROVIDER_LABELS,
  LMS_PROVIDER_DESCRIPTIONS,
} from "../../lib/lms-templates";

type Props = {
  provider: "TRACKTALLY" | "SIMON";
};

export function LmsMappingPreview({ provider }: Props) {
  const incidentTemplate = LMS_TEMPLATES[provider];
  const commendationTemplate = COMMENDATION_TEMPLATES[provider];
  const defaultFields = getDefaultFields(provider);

  const incidentFields = Object.keys(incidentTemplate);
  const commendationFields = Object.keys(commendationTemplate);

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: "14px",
        padding: "1rem 1.25rem",
        border: "1px solid #e2e8f0",
        marginTop: "0.5rem",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", color: "#0f172a" }}>
          {LMS_PROVIDER_LABELS[provider]}
        </h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          {LMS_PROVIDER_DESCRIPTIONS[provider]}
        </p>
      </div>

      <details style={{ marginTop: "1rem" }}>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
            color: "#0f766e",
            fontSize: "0.9rem",
          }}
        >
          View Field Mapping ({incidentFields.length} incident fields, {commendationFields.length} commendation fields)
        </summary>

        <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
          {/* Incident Mapping */}
          <div>
            <h4
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.9rem",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Incident Fields
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {incidentFields.map((field) => {
                const isDefault = defaultFields.includes(field);
                return (
                  <div
                    key={field}
                    style={{
                      background: "white",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      border: isDefault ? "1px solid #fbbf24" : "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isDefault ? "#fbbf24" : "#10b981",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#0f172a" }}>{field}</span>
                    {isDefault && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: "0.7rem",
                          color: "#92400e",
                          background: "#fef3c7",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                        }}
                      >
                        default
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commendation Mapping */}
          <div>
            <h4
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.9rem",
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Commendation Fields
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {commendationFields.map((field) => {
                const isDefault = defaultFields.includes(field);
                return (
                  <div
                    key={field}
                    style={{
                      background: "white",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      border: isDefault ? "1px solid #fbbf24" : "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isDefault ? "#fbbf24" : "#10b981",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#0f172a" }}>{field}</span>
                    {isDefault && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: "0.7rem",
                          color: "#92400e",
                          background: "#fef3c7",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                        }}
                      >
                        default
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              fontSize: "0.8rem",
              color: "#64748b",
              padding: "0.75rem",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              <span>Mapped from TrackTally data</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#fbbf24",
                }}
              />
              <span>Using default value (not yet collected)</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
