import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AreaSearchBar from './AreaSearchBar';
import CustomerSearchBar from './CustomerSearchBar';

const DashboardListHeader = ({ 
  groupAreas,
  selectedAreaId,
  selectedAreaName,
  setSelectedAreaId,
  setSelectedAreaName,
  chartData,
  loadingChart,
  paidTodayCustomers,
  notPaidTodayCustomers,
  totalPaidCash,
  totalPaidUPI,
  totalNotPaid,
  areaCurrentBalance,
  totalAmountGivenPending,
  totalExpenses,
  barChartData,
  customerListTitle,
  displayedCustomerList,
  customerList,
  setDisplayedCustomerList,
  generateAndShareCsv,
  handlePieSliceClick,
  setLargeChartType,
  setLargeChartData,
  setLargeChartTitle,
  setShowLargeChartModal,
  chartConfig,
  formatNumberWithCommas,
  cashOnHand,
}) => {
  const navigation = useNavigation();

  return (
    <View>
      <View style={styles.searchContainer}>
        <AreaSearchBar
          areas={groupAreas}
          onAreaSelect={(id, name) => {
            setSelectedAreaId(id);
            setSelectedAreaName(name);
          }}
          selectedAreaName={selectedAreaName}
        />
      </View>

      {selectedAreaId && (
        <>
          <View style={styles.card}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>Customer Payment Status</Text>
              <TouchableOpacity onPress={generateAndShareCsv} style={styles.shareButton}>
                <MaterialIcons name="share" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {loadingChart ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <PieChart
                data={chartData}
                width={Dimensions.get('window').width - 64}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                onDataPointClick={handlePieSliceClick}
              />
            )}
            {!loadingChart && (
              <View style={styles.legendContainer}>
                <TouchableOpacity style={styles.legendItem} onPress={() => handlePieSliceClick({ name: 'Paid Today' }) }>
                  <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Paid Today ({paidTodayCustomers.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.legendItem} onPress={() => handlePieSliceClick({ name: 'Not Paid Today' }) }>
                  <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                  <Text style={styles.legendText}>Not Paid Today ({notPaidTodayCustomers.length})</Text>
                </TouchableOpacity>
              </View>
            )}
            {!loadingChart && (
              <View style={styles.totalsContainer}>
                <Text style={styles.totalText}>Paid by Cash: ₹{formatNumberWithCommas(totalPaidCash.toFixed(2))}</Text>
                <Text style={styles.totalText}>Paid by UPI: ₹{formatNumberWithCommas(totalPaidUPI.toFixed(2))}</Text>
                <Text style={[styles.totalText, styles.paidTotalText]}>Total Paid: ₹{formatNumberWithCommas((totalPaidCash + totalPaidUPI).toFixed(2))}</Text>
                <Text style={[styles.totalText, styles.notPaidTotalText]}>Not Paid (Today): ₹{formatNumberWithCommas(totalNotPaid.toFixed(2))}</Text>
              </View>
            )}
            {!loadingChart && (
              <View style={styles.totalsContainer}>
                <Text style={styles.totalText}>Area Current Balance: ₹{formatNumberWithCommas(areaCurrentBalance.toFixed(2))}</Text>
                <Text style={styles.totalText}>+ Total Paid Today: ₹{formatNumberWithCommas((totalPaidCash + totalPaidUPI).toFixed(2))}</Text>
                <Text style={styles.totalText}>- Pending Customer(s): ₹{formatNumberWithCommas(totalAmountGivenPending.toFixed(2))}</Text>
                <Text style={styles.totalText}>- Total Expenses: ₹{formatNumberWithCommas(totalExpenses.toFixed(2))}</Text>
                <Text style={[styles.totalText, styles.cashOnHandText]}>Cash on Hand: {cashOnHand >= 0 ? '+' : ''}₹{formatNumberWithCommas(cashOnHand.toFixed(2))}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.viewLargerButton}
              onPress={() => {
                setLargeChartType('pie');
                setLargeChartData(chartData);
                setLargeChartTitle('Customer Payment Status');
                setShowLargeChartModal(true);
              }}
            >
              <Text style={styles.viewLargerButtonText}>View Larger</Text>
            </TouchableOpacity>
          </View>

          {barChartData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{customerListTitle}</Text>
              <ScrollView horizontal={true}>
                <BarChart
                  data={barChartData}
                  width={Math.max(Dimensions.get('window').width - 64, barChartData.labels.length * 70)} // Increased multiplier
                  height={300}
                  yAxisLabel="₹"
                  chartConfig={chartConfig}
                  verticalLabelRotation={60}
                  fromZero={true}
                  showValuesOnTopOfBars={true}
                  renderValues={(value, index) => {                      const customer = displayedCustomerList[index];                      console.log('Dashboard BarChart - Customer:', customer);
                    return `₹${value.toFixed(0)}
${customer ? customer.book_no : ''}`;
                  }}
                  style={{ paddingRight: 30, paddingLeft: 10 }}
                />
              </ScrollView>
              <TouchableOpacity
                style={styles.viewLargerButton}
                onPress={() => {
                  setLargeChartType('bar');
                  setLargeChartData(barChartData);
                  setLargeChartTitle(customerListTitle);
                  setShowLargeChartModal(true);
                }}
              >
                <Text style={styles.viewLargerButtonText}>View Larger</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <CustomerSearchBar
        customerList={customerList}
        setDisplayedCustomerList={setDisplayedCustomerList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareButton: {
    padding: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  viewLargerButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'center',
  },
  viewLargerButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  totalsContainer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  paidTotalText: {
    color: 'green',
  },
  notPaidTotalText: {
    color: 'red',
  },
  cashOnHandText: {
    color: '#007AFF', // A distinct color for Cash on Hand
    fontWeight: 'bold',
  },
});

export default DashboardListHeader;