import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const CustomerListItem = ({ item, onLongPress }) => {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    setExpanded(!expanded);
  };

  return (
    <View style={styles.customerItemContainer}>
      <TouchableOpacity onPress={handlePress} onLongPress={() => onLongPress(item)}>
        <View style={styles.customerItem}>
          <Text style={[styles.customerBookNo, { flex: 1 }]}>{item.book_no}</Text>
          <Text style={[styles.customerName, { flex: 2.5 }]}>{item.name}</Text>
          <Text style={[styles.customerMobile, { flex: 2 }]}>{item.mobile} (₹{item.expected_repayment_amount})</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.customerDetailsContainer}>
          <Text style={styles.detailText}>Total Amount to Pay: ₹{item.totalAmountToPay}</Text>
          <Text style={styles.detailText}>Total Periods: {item.completionPeriods}</Text>
          <Text style={styles.detailText}>Repayment Amount: ₹{item.expected_repayment_amount}</Text>
          <Text style={[styles.detailText, styles.pendingText]}>Pending Repayment Period: {item.repaymentPeriod}</Text>
          <Text style={[styles.detailText, { color: 'green' }]}>Paid Repayment Period: {item.remainingPeriods}</Text>
          <Text style={[styles.detailText, { color: 'blue' }]}>Total Amount Received: ₹{item.totalAmountReceived}</Text>
          <Text style={styles.detailText}>Start Date: {item.start_date}</Text>
          <Text style={[styles.detailText, { color: 'blue' }]}>End Date: {item.end_date}</Text>
          <Text style={styles.detailText}>Transaction Date: {item.transaction_date}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  customerDetailsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  pendingText: {
    color: 'red',
  },
});

export default CustomerListItem;
