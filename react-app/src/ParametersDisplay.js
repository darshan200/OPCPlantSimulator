import React, { useState } from "react";
import { TextField, Typography, Box, Button } from "@mui/material";

export const ParametersDisplay = ({
  parameters,
  setParameters,
  handleCheckClick,
  handleSimulateClick,
  handleUrlChange, // New prop
  statuses, // Add the statuses prop
}) => {
  const [editingParams, setEditingParams] = useState({}); // Track which parameters are being edited
  const [url, setUrl] = useState(""); // State to track the URL

  const handleUrlSubmit = () => {
    console.log("Updated URL:", url);
    if (url) {
      handleUrlChange(url); // Call the function from App.js to update the URL
      console.log("Updated URL:", url);
    } else {
      alert("Please enter a valid URL.");
    }
  };

  return (
    <Box
      sx={{
        padding: 2,
        backgroundColor: "rgba(255, 255, 255, 0.8)", // Semi-transparent white
        borderRadius: "8px",
        maxWidth: "100%",
        width: "98%",
        margin: "auto",
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow for better visibility
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)", // Two equal columns
        gap: "20px", // Space between items
      }}
    >
      {Object.keys(parameters).map((param, index) => (
        <Box
          key={param}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "75px",
          }}
        >
          <Typography
            sx={{
              fontWeight: "bold",
              width: "120px", // Reserve space for labels
              flexShrink: 0,
              textAlign: "left",
            }}
          >
            {param}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexGrow: 1,
            }}
          >
            <TextField
              type="number"
              value={
                editingParams[param] !== undefined
                  ? editingParams[param]
                  : parameters[param]?.value ?? ""
              }
              disabled={!parameters[param].IsEditable}
              onChange={(e) => {
                const newValue = e.target.value;
                setEditingParams((prev) => ({ ...prev, [param]: newValue }));
                setParameters((prev) => ({
                  ...prev,
                  [param]: { ...prev[param], isUpdated: true },
                }));
              }}
              onFocus={() =>
                setEditingParams((prev) => ({
                  ...prev,
                  [param]: parameters[param]?.value || "",
                }))
              }
              onBlur={() => {
                setParameters((prev) => ({
                  ...prev,
                  [param]: {
                    ...prev[param],
                    value: editingParams[param],
                    isUpdated: true,
                  },
                }));
                setEditingParams((prev) => {
                  const updated = { ...prev };
                  delete updated[param];
                  return updated;
                });
              }}
              size="small"
              sx={{ width: "150px" }}
            />
            {parameters[param].IsEditable && (
              <Button
                disabled={!parameters[param].isUpdated}
                onClick={() => {
                  handleCheckClick(param);
                  setParameters((prev) => ({
                    ...prev,
                    [param]: { ...prev[param], isUpdated: false },
                  }));
                }}
                variant="contained"
                color="primary"
                size="small"
              >
                Update
              </Button>
            )}
          </Box>
        </Box>
      ))}

      {/* URL Field */}
      <Box
        sx={{
          gridColumn: "span 2", // Span across both columns
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            textAlign: "left", // Align text to the left
          }}
        >
          Configuration
        </Typography>
        {/* Docker Container Status Section */}
        <Box>
        <Typography
          variant="h7"
          sx={{
            fontWeight: "bold",
            textAlign: "left", // Align text to the left
            marginBottom: "20px", // Add some space below the title
          }}
        >
          Docker Container Statuses
        </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "10px", // Space between container status items
          backgroundColor: "rgba(0, 0, 0, 0.05)", // Light gray background
          padding: "10px", // Padding around the content
          borderRadius: "8px", // Rounded corners
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow
        }}
      >
      {Object.entries(statuses).map(([container, status]) => (
        <Box
          key={container}
          sx={{
            display: "flex",
            justifyContent: "space-between", // Align text on both ends
            alignItems: "center",
            padding: "5px 10px", // Inner padding
            backgroundColor: status === "Running" ? "rgba(0, 128, 0, 0.1)" : "rgba(255, 0, 0, 0.1)", // Green for running, red for not running
            borderRadius: "4px", // Slight rounding for each status
          }}
        >
      <Typography
        sx={{
          fontWeight: "200",
          color: "rgba(0, 0, 0, 0.8)", // Dark gray text
          text: "100px",
        }}
      >
        {container}
      </Typography>
        <Typography
          sx={{
            fontWeight: "bold",
            color: status === "Running" ? "green" : "red", // Green text for running, red for not running
          }}
        >
          {status}
        </Typography>
      </Box>
    ))}
  </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px", // Space between TextField and Button
          }}
        >
          <TextField
            label="API URL"
            variant="outlined"
            size="small"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleUrlSubmit}
            sx={{ backgroundColor: "black", color: "white" }}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
