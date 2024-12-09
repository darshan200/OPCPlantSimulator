import React, { useState } from "react";
import {
  MenuItem,
  Select,
  Box,
  InputLabel,
  TextField,
  Button,
} from "@mui/material";

export const DeviceSelector = ({
  devices,
  freq,
  selected,
  onSelect,
  onFreqChange,
}) => {
  const [isUpdate, setIsUpdate] = useState(false); // Tracks if the frequency is being updated
  const [currentFreq, setCurrentFreq] = useState(freq); // Local frequency state
  const [buttonText, setButtonText] = useState("Update"); // Tracks button text state

  const handleChange = (event) => {
    onSelect(event.target.value); // Calls parent `onSelect` function when device is changed
  };

  const handleFreqChange = (event) => {
    const newFreq = Math.max(1, event.target.value); // Prevents frequency from being less than 1
    setCurrentFreq(newFreq); // Updates the local frequency state
  };

  const handleUpdateFreq = () => {
    onFreqChange(currentFreq); // Calls parent `onFreqChange` function with the current frequency
    setButtonText("Updated"); // Sets button text to "Updated"
    setIsUpdate(false); // Disables editing mode

    // Revert button text back to "Update" after 5 seconds
    setTimeout(() => {
      setButtonText("Update");
    }, 2000);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "space-between",
      }}
    >
      {/* Device Selector */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          width: "300px",
          marginLeft: "250px",
        }}
      >
        <InputLabel
          id="device-label"
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
          }}
        >
          Device
        </InputLabel>
        <Select
          labelId="device-label"
          value={selected}
          onChange={handleChange}
          sx={{ width: "200px", height: "40px", color: "white",border: "1px solid #ccc" }}
        >
          {devices.map((device) => (
            <MenuItem key={device} value={device}>
              {device}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Frequency Update Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          width: "300px",
          gap: "20px",
          marginLeft: "250px",
          color: "white",
        }}
      >
        <InputLabel
          id="freq-label"
          sx={{
            display: "flex",
            color: "white",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          Plant Freq
        </InputLabel>
        <div style={{ display: "flex", width: "200px" }}>
          <TextField
            type="number"
            value={currentFreq}
            disabled={!isUpdate}
            onChange={handleFreqChange}
            size="small"
            sx={{ height: "40px",
                  border: "1px solid #ccc", 
                  input: {
                    color: "white", // Apply text color to the input
                  },
                  // Apply white color even when the input is disabled
                  "& .MuiInputBase-input.Mui-disabled": {
                    color: "white !important", // Force white color when disabled
                  },
                  "&::placeholder": {
                    color: "white", // Ensure placeholder color is also white
                  },
                }}
          />
          {isUpdate ? (
            <Button
              variant="contained"
              color="success"
              onClick={handleUpdateFreq}
              sx={{ marginLeft: "10px",backgroundColor: "#1d4ed8" ,color: "#fff",}}
            >
              {buttonText}
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={() => setIsUpdate(true)}
              sx={{
                backgroundColor: "black",
                color: "white",
                marginLeft: "10px",
                backgroundColor: "#1d4ed8",
                color: "#fff",
              }}
            >
              {buttonText}
            </Button>
          )}
        </div>
      </Box>
    </Box>
  );
};
