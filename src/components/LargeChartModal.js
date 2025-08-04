import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';

const chartConfig = {
  backgroundColor: '#e26a00',
  backgroundGradientFrom: '#fb8c00',
  backgroundGradientTo: '#ffa726',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#ffa726',
  },
};

export default function LargeChartModal({
  isVisible,
  onClose,
  chartType, // 'pie' or 'bar'
  chartData,
  chartTitle,
}) {
  const screenWidth = Dimensions.get('window').width;

  return (
    <Modal
      visible={isVisible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{chartTitle}</Text>
          <ScrollView horizontal={chartType === 'bar'} contentContainerStyle={styles.chartScrollViewContent}>
            {chartType === 'pie' && chartData ? (
              <PieChart
                data={chartData}
                width={screenWidth * 0.8} // Adjust width for modal
                height={250}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
              />
            ) : chartType === 'bar' && chartData ? (
              <BarChart
                data={chartData}
                width={Math.max(screenWidth * 0.8, chartData.labels.length * 60)} // Dynamic width for bar chart
                height={350}
                yAxisLabel="₹"
                chartConfig={chartConfig}
                verticalLabelRotation={60}
                fromZero={true}
                style={{ paddingRight: 30 }}
              />
            ) : (
              <Text>No chart data available.</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartScrollViewContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
