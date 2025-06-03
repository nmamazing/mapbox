import React, { useState, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  initiallyExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, initiallyExpanded = false }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View style={styles.section}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text style={styles.headerText}>{title}</Text>
        <Text style={styles.arrow}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f0f0f0",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  arrow: {
    fontSize: 18,
  },
  content: {
    padding: 16,
  },
});

export default CollapsibleSection; 