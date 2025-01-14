import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ResistivityCalculatorScreen = () => {
  // State hooks for inputs and values
  const [length, setLength] = useState('');
  const [smallerRadiusLength, setSmallerRadiusLength] = useState('');
  const [voltage, setVoltage] = useState<number | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [resistivity, setResistivity] = useState<number | null>(null);
  const [data, setData] = useState<any[]>([]); // Data to be plotted

  // Function to simulate fetching Voltage and Current
  const getVoltageAndCurrent = () => {
    // Simulate fetching from Raspberry Pi Pico
    const voltageValue = 5; // Example: 5V
    const currentValue = 0.02; // Example: 20mA
    setVoltage(voltageValue);
    setCurrent(currentValue);
  };

  // Function to calculate Resistivity
  const calculateResistivity = (length: number, smallerRadiusLength: number) => {
    if (voltage !== null && current !== null) {
      return (
        (Math.PI * voltage * (Math.pow(length, 2) - Math.pow(smallerRadiusLength, 2))) /
        (2 * smallerRadiusLength * current)
      );
    }
    return null;
  };

  // Handle form submission and data storage
  const handleCalculate = async () => {
    if (length && smallerRadiusLength) {
      const lengthVal = parseFloat(length);
      const radiusLengthVal = parseFloat(smallerRadiusLength);
      const resistivityValue = calculateResistivity(lengthVal, radiusLengthVal);

      if (resistivityValue !== null) {
        setResistivity(resistivityValue);

        // Update the graph data
        const newDataEntry = { x: lengthVal, y: resistivityValue };

        // Add and sort data by the x-axis (Length)
        const updatedData = [...data, newDataEntry].sort((a, b) => a.x - b.x);
        setData(updatedData);

        // Save to local storage
        await AsyncStorage.setItem('resistivityData', JSON.stringify(updatedData));
      }
    }
  };

  // Extract labels and values for the chart
  const labels = data.map((entry) => entry.x.toFixed(1)); // x-values (Length) as string
  const resistivityValues = data.map((entry) => entry.y); // y-values (Resistivity)

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Resistivity Calculator</Text>

      <Button title="Fetch Voltage and Current" onPress={getVoltageAndCurrent} />

      {voltage !== null && current !== null && (
        <View style={styles.valuesContainer}>
          <Text>Voltage: {voltage} V</Text>
          <Text>Current: {current} A</Text>
        </View>
      )}

      <Text>Length (L) in meters:</Text>
      <TextInput
        style={styles.input}
        value={length}
        onChangeText={setLength}
        keyboardType="numeric"
      />

      <Text>Smaller Radius Length (in meters):</Text>
      <TextInput
        style={styles.input}
        value={smallerRadiusLength}
        onChangeText={setSmallerRadiusLength}
        keyboardType="numeric"
      />

      <Button title="Calculate Resistivity" onPress={handleCalculate} />

      {resistivity !== null && (
        <View style={styles.valuesContainer}>
          <Text>Calculated Resistivity: {resistivity.toFixed(3)} Ohm·m</Text>
        </View>
      )}

      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels, // Sorted Lengths for x-axis
            datasets: [{ data: resistivityValues, strokeWidth: 2 }],
          }}
          width={300} // Adjust as needed
          height={220}
          chartConfig={chartConfig}
          bezier
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  valuesContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  chartContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
});

export default ResistivityCalculatorScreen;
