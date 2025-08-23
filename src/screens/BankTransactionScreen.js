import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import SearchableDropdown from '../components/SearchableDropdown';
import { supabase } from '../services/supabase';

const BankTransactionScreen = ({ navigation }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date());
    const [areaMasterId, setAreaMasterId] = useState(null);
    const [areaMasters, setAreaMasters] = useState([]);
    const [transactionType, setTransactionType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [areaSearchQuery, setAreaSearchQuery] = useState('');
    const [filteredAreas, setFilteredAreas] = useState([]);
    const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);

    // New state for Bank Accounts
        // New state for Bank Accounts
    const [bankAccountId, setBankAccountId] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);

    // New state for Bank Transactions (for display)
    const [bankTransactions, setBankTransactions] = useState([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);


    const transactionTypes = [
        'deposit_own_funds',
        'withdrawal_own_funds',
        'borrow_from_bank',
        'repay_to_bank',
        'customer_loan_disbursement',
        'customer_loan_repayment',
    ];

    useEffect(() => {
        fetchAreaMasters();
        fetchBankAccounts(); // Fetch bank accounts on component mount
    }, []);

    // Effect to fetch transactions when areaMasterId changes
    useEffect(() => {
        if (areaMasterId) {
            fetchBankTransactions(areaMasterId);
        } else {
            setBankTransactions([]); // Clear transactions if no area is selected
        }
    }, [areaMasterId]);


    const fetchAreaMasters = async () => {
        setLoading(true);
        console.log('Attempting to fetch area masters...');
        const { data, error } = await supabase
            .from('area_master')
            .select('id, area_name');
        if (error) {
            console.error('Error fetching area masters:', error);
            Alert.alert('Error', 'Failed to fetch area masters: ' + error.message);
        } else {
            console.log('Area masters fetched successfully:', data);
            setAreaMasters(data || []);
        }
        setLoading(false);
    };

    const fetchBankAccounts = async () => {
        setLoading(true); // Using the same loading state for now, might need separate later
        console.log('Attempting to fetch bank accounts...');
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('id, bank_name, account_number'); // Assuming these columns exist
        if (error) {
            console.error('Error fetching bank accounts:', error);
            Alert.alert('Error', 'Failed to fetch bank accounts: ' + error.message);
        } else {
            console.log('Bank accounts fetched successfully:', data);
            setBankAccounts(data || []);
        }
        setLoading(false);
    };

    const fetchBankTransactions = async (areaId) => {
        setLoadingTransactions(true);
        console.log('Attempting to fetch bank transactions for area:', areaId);
        const { data, error } = await supabase
            .from('bank_transactions')
            .select('*, bank_accounts(bank_name, account_number)') // Fetch related bank account info
            .eq('area_id', areaId)
            .order('transaction_date', { ascending: false });

        if (error) {
            console.error('Error fetching bank transactions:', error);
            Alert.alert('Error', 'Failed to fetch bank transactions: ' + error.message);
        } else {
            console.log('Bank transactions fetched successfully:', data);
            setBankTransactions(data || []);
        }
        setLoadingTransactions(false);
    };


    const handleAddTransaction = async () => {
        console.log('Attempting to add transaction...');
        console.log('Amount:', amount);
        console.log('Description:', description);
        console.log('Transaction Date:', transactionDate.toISOString());
        console.log('Area Master ID:', areaMasterId);
        console.log('Bank Account ID:', bankAccountId); // Log new field
        console.log('Transaction Type:', transactionType);

        if (!amount || !description || !areaMasterId || !bankAccountId || !transactionType) { // Added bankAccountId to validation
            Alert.alert('Error', 'Please fill all fields.');
            console.log('Validation failed: Missing fields.');
            return;
        }

        setLoading(true);
        console.log('Loading state set to true. Attempting Supabase insert...');

        const { data, error } = await supabase
            .from('bank_transactions')
            .insert([
                {
                    amount: parseFloat(amount),
                    description: description,
                    transaction_date: transactionDate.toISOString(),
                    area_id: areaMasterId,
                    bank_account_id: bankAccountId, // Include bank account ID
                    transaction_type: transactionType,
                },
            ]);

        if (error) {
            console.error('Supabase insert error:', error);
            Alert.alert('Error', 'Failed to add transaction: ' + error.message);
        } else {
            console.log('Transaction added successfully:', data);
            Alert.alert('Success', 'Transaction added successfully!');
            setAmount('');
            setDescription('');
            setTransactionDate(new Date());
            setAreaMasterId(null);
            setAreaSearchQuery('');
            setBankAccountId(null);
            setBankAccountSearchQuery('');
            setTransactionType(null);
            fetchBankTransactions(areaMasterId); // Refresh transactions for the current area
        }
        setLoading(false);
        console.log('Loading state set to false. Transaction process complete.');
    };

    const handleAreaSelect = (area) => {
        setAreaMasterId(area.id);
        setAreaSearchQuery(area.area_name);
        setShowAreaSuggestions(false);
    };

    const handleBankAccountSelect = (account) => {
        setBankAccountId(account.id);
        setBankAccountSearchQuery(`${account.bank_name} - ${account.account_number}`);
        setShowBankAccountSuggestions(false);
    };

    const renderTransactionItem = ({ item }) => (
        <View style={styles.transactionItem}>
            <Text style={styles.transactionText}>Amount: {item.amount}</Text>
            <Text style={styles.transactionText}>Description: {item.description}</Text>
            <Text style={styles.transactionText}>Type: {item.transaction_type}</Text>
            <Text style={styles.transactionText}>Date: {new Date(item.transaction_date).toLocaleDateString()}</Text>
            {item.bank_accounts && (
                <Text style={styles.transactionText}>Bank: {item.bank_accounts.bank_name} ({item.bank_accounts.account_number})</Text>
            )}
        </View>
    );


    const renderHeader = () => (
        <View style={styles.scrollViewContent}>
            <Text style={styles.label}>Select Area:</Text>
            <SearchableDropdown
                data={areaMasters}
                onSelect={setAreaMasterId}
                selectedValue={areaMasterId}
                placeholder="Select Area"
                labelField="area_name"
                valueField="id"
            />

            {/* New Bank Account Selection */}
            <Text style={styles.label}>Select Bank Account:</Text>
            <SearchableDropdown
                data={bankAccounts}
                onSelect={setBankAccountId}
                selectedValue={bankAccountId}
                placeholder="Select Bank Account"
                labelField="bank_name" // Assuming bank_name is the primary display field
                valueField="id"
            />


            <TextInput
                style={styles.input}
                placeholder="Amount"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
            />
            <TextInput
                style={styles.input}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
            />

            <Text style={styles.label}>Transaction Type:</Text>
            <Picker
                selectedValue={transactionType}
                style={styles.picker}
                onValueChange={(itemValue) => setTransactionType(itemValue)}
            >
                <Picker.Item label="-- Select Transaction Type --" value={null} />
                {transactionTypes.map((type) => (
                    <Picker.Item key={type} label={type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={type} />
                ))}
                </Picker>

            <Button
                title={loading ? "Adding..." : "Add Transaction"}
                onPress={handleAddTransaction}
                disabled={loading}
            />

            {/* Section title for transactions */}
            {areaMasterId && (
                <View style={styles.transactionsSection}>
                    <Text style={styles.sectionTitle}>Transactions for Selected Area</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={bankTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTransactionItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={() => (
                    !areaMasterId ?
                    <Text style={styles.noResultsText}>Please select an area to view transactions.</Text> :
                    <Text style={styles.noResultsText}>No transactions found for this area.</Text>
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={loadingTransactions}
                        onRefresh={() => areaMasterId && fetchBankTransactions(areaMasterId)}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 0,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginTop: 10,
        marginBottom: 5,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
        width: '100%',
        marginBottom: 10,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    suggestionsList: {
        maxHeight: 150,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    noResultsText: {
        padding: 10,
        textAlign: 'center',
        color: '#888',
    },
    scrollViewContent: {
        flexGrow: 1,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    transactionsSection: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    transactionsList: {
        maxHeight: 300, // Limit height of transactions list
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    transactionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    transactionText: {
        fontSize: 14,
        marginBottom: 2,
    },
});

export default BankTransactionScreen;