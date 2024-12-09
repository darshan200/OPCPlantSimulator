import React, { useState, useEffect, useRef, useCallback } from "react";
import { PlantSelector } from "./PlantSelector";
import { DeviceSelector } from "./DeviceSelector";
import { ParametersDisplay } from "./ParametersDisplay";
import { Box, Typography } from "@mui/material";

function App() {
  const [basePath, setBasePath] = useState(process.env.REACT_APP_API_BASE_URL);;
  const [plants, setPlants] = useState([]);
  const [plantDevices, setPlantDevices] = useState([]);
  const [plantFreq, setPlantFreq] = useState();
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedPlantDeviceDetails, setSelectedPlantDeviceDetails] = useState(null);
  const [statuses, setStatuses] = useState({}); // Add the statuses state
  const interval = useRef();

  // Reset and re-fetch data when the URL changes
  useEffect(() => {
    if (basePath) {
      setPlants([]); // Clear plants data to force re-fetch
      setPlantDevices([]); // Clear device data to force re-fetch
      setSelectedPlant(""); // Reset selected plant to trigger new fetch
      setSelectedDevice(""); // Reset selected device to trigger new fetch
      setSelectedPlantDeviceDetails(null); // Reset device details to trigger new fetch
    }
  }, [basePath]); // This will trigger whenever basePath (the URL) changes
  
  useEffect(() => {
    const fetchContainerStatuses = async () => {
      try {
        const response = await fetch(`${basePath}/container-status`);
        const data = await response.json();
        setStatuses(data); // Use the existing `statuses` state
      } catch (error) {
        console.error("Failed to fetch container statuses", error);
      }
    };
  
    fetchContainerStatuses();
    const interval = setInterval(fetchContainerStatuses, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch plant data
  const fetchPlants = async () => {
    if (basePath) {
      try {
        const response = await fetch(`${basePath}/plants`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const plants = await response.json();
        setPlants(plants);
      } catch (err) {
        console.error('Error fetching plants:', err)
      }
    } else {
      setPlants(["Plant1", "Plant2"]);
    }
  };

  // Fetch devices and set frequency based on selected plant
  const fetchPlantDevices = async () => {
    if (basePath) {
      try {
        const response = await fetch(`${basePath}/${selectedPlant}/devices`);
        const plantDevicesAndFreq = await response.json();
        setPlantDevices(plantDevicesAndFreq.devices);
        setPlantFreq(plantDevicesAndFreq.frequency);
        setSelectedDevice(plantDevicesAndFreq.devices[0]);
      } catch (err) {
        console.log("err", err);
      }
    } else {
      setPlantDevices(selectedPlant === "Plant1" ? ["Device1", "Device2"] : ["Device3", "Device4"]);
      setPlantFreq(30);
    }
  };

  // Fetch initial device details
  const fetchPlantDeviceDetails = async () => {
    if (basePath) {
      try {
        const response = await fetch(`${basePath}/${selectedPlant}/${selectedDevice}`);
        const plantDeviceDetails = await response.json();
        setSelectedPlantDeviceDetails(plantDeviceDetails);
      } catch (err) {
        console.log("err", err);
      }
    } else {
      setSelectedPlantDeviceDetails({
        pH: { value: 12, simulate: true },
        Humidity: { value: 1, simulate: true },
        temp: { value: 10, simulate: true },
      });
    }
  };

  // Fetch values periodically and update the UI
  const fetchPlantDeviceDetailsValues = async () => {
    if (basePath && selectedPlant && selectedDevice) {
      try {
        const response = await fetch(`${basePath}/${selectedPlant}/${selectedDevice}/values`);
        const plantDeviceDetailsValues = await response.json();
        setSelectedPlantDeviceDetails((prevDetails) => {
          if (!prevDetails) return null;
          const updatedDetails = { ...prevDetails };
          Object.keys(plantDeviceDetailsValues).forEach((key) => {
            updatedDetails[key] = { ...updatedDetails[key], value: plantDeviceDetailsValues[key] };
          });
          return updatedDetails;
        });
      } catch (err) {
        console.log("err", err);
      }
    } else {
      setSelectedPlantDeviceDetails({
        pH: { value: 20, simulate: true },
        Humidity: { value: 8, simulate: true },
        temp: { value: 7, simulate: true },
      });
    }
  };

  const handleFreqChange = async (newFreq) => {
    if (basePath) {
      try {
        const response = await fetch(`${basePath}/${selectedPlant}/updateFreq`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: +newFreq })
        });
        const res = await response.json();
        if (res) {
          interval.current && clearInterval(interval.current);
          setPlantFreq(+newFreq);
        }
      } catch (err) {
        console.log("err", err);
      }
    } else {
      interval.current && clearInterval(interval.current);
      setPlantFreq(+newFreq);
    }
  };

  const handleCheckClick = useCallback(async (param) => {
    if (basePath) {
      const response = await fetch(`${basePath}/${selectedPlant}/${selectedDevice}/${param}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: selectedPlantDeviceDetails[param].value, simulation: false })
      });
      const res = await response.json();
      if (res) {
        const paramValue = selectedPlantDeviceDetails[param];
        setSelectedPlantDeviceDetails((prevDetails) => ({
          ...prevDetails,
          [param]: {
            ...paramValue,
            isUpdated: false,
          },
        }));
      }
    } else {
      const paramValue = selectedPlantDeviceDetails[param];
      setSelectedPlantDeviceDetails((prevDetails) => ({
        ...prevDetails,
        [param]: {
          ...paramValue,
          isUpdated: false,
        },
      }));
    }
  }, [selectedPlant, selectedDevice, selectedPlantDeviceDetails]);

  const handleSimulateClick = useCallback(async (param) => {
    if (basePath) {
      const response = await fetch(`${basePath}/${selectedPlant}/${selectedDevice}/${param}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: selectedPlantDeviceDetails[param].value, simulation: true })
      });
      const res = await response.json();
      if (res) {
        const paramValue = selectedPlantDeviceDetails[param];
        setSelectedPlantDeviceDetails((prevDetails) => ({
          ...prevDetails,
          [param]: {
            ...paramValue,
            simulation: true,
          },
        }));
      }
    }
  }, [selectedPlant, selectedDevice, selectedPlantDeviceDetails]);
  
  const handleUrlChange = (newUrl) => {
    setBasePath(newUrl); // Update the basePath with the new URL
  };

  useEffect(() => {
    fetchPlants();
  }, [basePath]);

  useEffect(() => {
    selectedPlant && fetchPlantDevices();
  }, [selectedPlant, basePath]);

  useEffect(() => {
    selectedDevice && fetchPlantDeviceDetails();
  }, [selectedDevice, basePath]);

  useEffect(() => {
    if (plants.length) {
      setSelectedPlant(plants[0]);
    }
  }, [plants]);

  useEffect(() => {
    if (plantDevices.length) setSelectedDevice(plantDevices[0]);
  }, [plantDevices]);

  // Effect to handle periodic updates
  useEffect(() => {
    if (plantFreq && selectedPlant && selectedDevice) {
      fetchPlantDeviceDetailsValues(); // Fetch immediately on mount
      if (interval.current) clearInterval(interval.current); // Clear existing interval if any
      interval.current = setInterval(fetchPlantDeviceDetailsValues, plantFreq * 1000); // Set periodic fetching
    } else {
      clearInterval(interval.current);
    }

    // Cleanup interval on unmount or dependencies change
    return () => {
      clearInterval(interval.current);
    };
  }, [plantFreq, selectedPlant, selectedDevice]);

  return (
    <Box
  sx={{
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4c1d95, #1d4ed8)", // Gradient background
    gap: "20px",
  }}
>
  {/* Bioreactor Image */}
  <Box
  sx={{
    width: "20%", // Set width to 20% of the screen
    height: "auto", // Automatically scale height
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }}
>
  <img
    src="/bioreactorV2.gif"
    alt="Bioreactor"
    style={{ maxWidth: "80%", maxHeight: "100%", marginTop: "280px" }}
  />
</Box>

  {/* Parameters Section */}
  <Box
    sx={{
      width: "72%", // 80% of the screen
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      padding: "20px",
    }}
  >
    {/* Title */}
    <Typography
      variant="h4"
      component="h1"
      sx={{
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        marginLeft:"-120px",
        justifyContent:"center",
      }}
    >
      Plant Simulator
    </Typography>

    {/* Other Components */}
    <PlantSelector plants={plants || []} selected={selectedPlant} onSelect={setSelectedPlant} />
    {selectedPlant && plantFreq && (
      <DeviceSelector
        devices={plantDevices}
        freq={plantFreq}
        selected={selectedDevice}
        onSelect={setSelectedDevice}
        onFreqChange={handleFreqChange}
      />
    )}
    {selectedPlantDeviceDetails && (
      <ParametersDisplay
        parameters={selectedPlantDeviceDetails}
        setParameters={setSelectedPlantDeviceDetails}
        handleCheckClick={handleCheckClick}
        handleSimulateClick={handleSimulateClick}
        handleUrlChange={handleUrlChange}
        statuses={statuses} // Pass statuses as a prop
      />
    )}
  </Box>
</Box>

  );
}

export default App;