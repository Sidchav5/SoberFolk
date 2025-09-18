import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const DriverScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚖 Driver Dashboard</Text>
      <Text style={styles.subtitle}>Welcome Driver, manage your rides here.</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>View Assigned Rides</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Go Online / Offline</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Earnings</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DriverScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#6E44FF",
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
});
