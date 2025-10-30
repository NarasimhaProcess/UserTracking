import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

const CustomerSearchBar = ({ customerList, setDisplayedCustomerList }) => {
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const debounceTimeout = useRef(null);

  const handleSearchChange = useCallback((text) => {
    setCustomerSearchQuery(text);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      console.log('Performing debounced search for:', text);
      const filtered = customerList.filter(customer => 
        customer.name.toLowerCase().includes(text.toLowerCase()) ||
        customer.mobile.includes(text) ||
        (customer.book_no && customer.book_no.toLowerCase().includes(text.toLowerCase()))
      );
      setDisplayedCustomerList(filtered);
    }, 500); // 500ms debounce delay
  }, [customerList, setDisplayedCustomerList]); // Add customerList and setDisplayedCustomerList to dependency array



  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.customerSearchInput}
        placeholder="Search customers by card no., name, or mobile."
        value={customerSearchQuery}
        onChangeText={handleSearchChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  customerSearchInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 8,
  },
});

export default CustomerSearchBar;