import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { supabase } from '../services/supabase';
import { locationTracker } from '../services/locationTracker';
import { PieChart, BarChart } from 'react-native-chart-kit';
import AreaSearchBar from '../components/AreaSearchBar';
import LargeChartModal from '../components/LargeChartModal';

export default function DashboardScreen({ user, userProfile }) {
  const [isTracking, setIsTracking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [groupAreas, setGroupAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');

  // Chart and List State
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [barChartData, setBarChartData] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [displayedCustomerList, setDisplayedCustomerList] = useState([]);
  const [customerListTitle, setCustomerListTitle] = useState('');
  const [paidTodayCustomers, setPaidTodayCustomers] = useState([]);
  const [notPaidTodayCustomers, setNotPaidTodayCustomers] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLargeChartModal, setShowLargeChartModal] = useState(false);
  const [largeChartType, setLargeChartType] = useState('');
  const [largeChartData, setLargeChartData] = useState(null);
  const [largeChartTitle, setLargeChartTitle] = useState('');

  useEffect(() => {
    // Check tracking status on initial load
    setIsTracking(locationTracker.getTrackingStatus());
    if (userProfile) {
      setIsTracking(userProfile.location_status === 1);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user?.id) return;
    
    async function fetchAreas() {
      const { data, error } = await supabase
        .from('user_groups')
        .select('groups(group_areas(area_master(id, area_name)))')
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching user's groups and areas:", error);
        return;
      }
      
      const areaList = [];
      const areaIdSet = new Set();
      data.forEach(userGroup => {
        userGroup.groups?.group_areas?.forEach(groupArea => {
          const area = groupArea.area_master;
          if (area && !areaIdSet.has(area.id)) {
            areaIdSet.add(area.id);
            areaList.push(area);
          }
        });
      });
      setGroupAreas(areaList);
    }

    fetchAreas();
  }, [user]);

  useEffect(() => {
    async function fetchPaymentData() {
      if (!selectedAreaId || !user?.id) {
        setChartData([]);
        setBarChartData(null);
        setCustomerList([]);
        setCustomerListTitle('');
        setLoadingChart(false);
        return;
      }

      setLoadingChart(true);
      setBarChartData(null);
      setCustomerList([]);
      setCustomerListTitle('');

      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, name, mobile, book_no, amount_given')
        .eq('area_id', selectedAreaId);

      if (customerError) {
        console.error('Error fetching customers for chart:', customerError);
        setLoadingChart(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('customer_id')
        .in('customer_id', customers.map(c => c.id))
        .eq('transaction_date', today)
        .eq('transaction_type', 'repayment');

      if (transactionError) {
        console.error("Error fetching today's transactions:", transactionError);
        setLoadingChart(false);
        return;
      }

      const paidCustomerIds = new Set(transactions.map(t => t.customer_id));
      const paidToday = customers.filter(c => paidCustomerIds.has(c.id));
      const notPaidToday = customers.filter(c => !paidCustomerIds.has(c.id));

      console.log("Unique Paid Today Customers:", paidToday.map(c => c.name));

      setPaidTodayCustomers(paidToday);
      setNotPaidTodayCustomers(notPaidToday);

      setChartData([
        { name: 'Paid Today', population: paidToday.length, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 15 },
        { name: 'Not Paid Today', population: notPaidToday.length, color: '#F44336', legendFontColor: '#7F7F7F', legendFontSize: 15 },
      ]);

      // Set Not Paid Today customers as default displayed list and bar chart
      setCustomerListTitle('Customers Who Did Not Pay Today');
      setCustomerList(notPaidToday);
      if (notPaidToday.length > 0) {
        setBarChartData({
          labels: notPaidToday.map(c => c.name.substring(0, 10)),
          datasets: [{ data: notPaidToday.map(c => c.amount_given || 0) }],
        });
      } else {
        setBarChartData(null);
      }

      setLoadingChart(false);
    }

    fetchPaymentData();
  }, [selectedAreaId, user]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await locationTracker.stopTracking();
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (user?.id) {
        setSelectedAreaId(prev => prev);
    }
    setRefreshing(false);
  };

  const handlePieSliceClick = (data) => {
    console.log('Pie slice clicked:', data);
    const { name } = data;
    let title = '';
    let customers = [];
    
    if (name === 'Paid Today') {
      title = 'Customers Who Paid Today';
      customers = paidTodayCustomers;
    } else {
      title = 'Customers Who Did Not Pay Today';
      customers = notPaidTodayCustomers;
    }
    
    setCustomerListTitle(title);
    setCustomerList(customers); // Store the full list
    setDisplayedCustomerList(customers); // Initially display the full list
    setCustomerSearchQuery(''); // Clear search query on new selection

    if (customers.length > 0) {
        const newBarChartData = {
            labels: customers.map(c => c.name.substring(0, 20)),
            datasets: [{ data: customers.map(c => c.repayment_amount || 0) }],
        };
        console.log('Setting bar chart data:', newBarChartData);
        setBarChartData(newBarChartData);
    } else {
        console.log('No customers, clearing bar chart data');
        setBarChartData(null);
    }
  };

  

  const renderHeader = () => {
    console.log('Rendering header, customer list length:', customerList.length);
    return (
      <>
        <View style={styles.header}>
          {userProfile?.profile_photo_data ? (
            <TouchableOpacity onPress={() => setShowProfileModal(true)}>
              <Image source={{ uri: userProfile.profile_photo_data }} style={styles.headerImage} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.title}>Dashboard</Text>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

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
              <Text style={styles.cardTitle}>Customer Payment Status</Text>
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
                  <TouchableOpacity style={styles.legendItem} onPress={() => handlePieSliceClick({ name: 'Paid Today' })}>
                    <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendText}>Paid Today ({paidTodayCustomers.length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.legendItem} onPress={() => handlePieSliceClick({ name: 'Not Paid Today' })}>
                    <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.legendText}>Not Paid Today ({notPaidTodayCustomers.length})</Text>
                  </TouchableOpacity>
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

        
      </>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedCustomerList}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {selectedAreaId && displayedCustomerList.length > 0 && (
              <View style={styles.customerListHeaderContainer}>
                <Text style={[styles.customerListHeaderText, { flex: 1 }]}>Card No.</Text>
                <Text style={[styles.customerListHeaderText, { flex: 2.5 }]}>Name</Text>
                <Text style={[styles.customerListHeaderText, { flex: 2 }]}>Mobile</Text>
              </View>
            )}
          </>
        )}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.customerItemContainer}>
            <View style={styles.customerItem}>
              <Text style={[styles.customerBookNo, { flex: 1 }]}>{item.book_no}</Text>
              <Text style={[styles.customerName, { flex: 2.5 }]}>{item.name}</Text>
              <Text style={[styles.customerMobile, { flex: 2 }]}>{item.mobile}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
            !selectedAreaId ? 
            <Text style={styles.emptyListText}>Please select an area to see customer details.</Text> :
            <Text style={styles.emptyListText}>No customers to display for the selected criteria.</Text>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="always" // Add this line
      />

      <Modal
        visible={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={{ uri: userProfile?.profile_photo_data }} style={styles.modalImage} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowProfileModal(false)}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LargeChartModal
        isVisible={showLargeChartModal}
        onClose={() => setShowLargeChartModal(false)}
        chartType={largeChartType}
        chartData={largeChartData}
        chartTitle={largeChartTitle}
      />
    </View>
  );
}

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
  propsForLabels: {
    fontSize: 10,
  },
  paddingLeft: 70, // Further increased padding for y-axis labels
  paddingRight: 20, // Added padding to the right
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  customerSearchInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  customerItemContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    paddingHorizontal: 20,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  customerListHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginTop: 10,
  },
  customerListHeaderText: {
    fontWeight: 'bold',
    color: '#1C1C1E',
    fontSize: 14,
  },
  customerName: {
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'left',
  },
  customerMobile: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'left',
  },
  customerBookNo: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'left',
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
  emptyListText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: '#8E8E93',
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
});