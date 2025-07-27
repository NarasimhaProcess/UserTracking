import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const AreaSearchBar = ({ areas, onAreaSelect, selectedAreaName }) => {
  const [query, setQuery] = useState(selectedAreaName || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimeout = useRef(null);

  const filterSuggestions = useCallback((text) => {
    if (!text) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const filtered = areas.filter(area => 
      area.area_name.toLowerCase().includes(text.toLowerCase())
    );
    setSuggestions(filtered);
    setLoading(false);
  }, [areas]);

  const onChangeText = (text) => {
    setQuery(text);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => filterSuggestions(text), 300);
  };

  const onSuggestionPress = (item) => {
    setQuery(item.area_name);
    setSuggestions([]);
    onAreaSelect(item.id, item.area_name);
  };

  const highlightMatch = (text, query) => {
    if (!query) return <Text>{text}</Text>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]/g, '\\$&')})`, 'i');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <Text key={i} style={{ fontWeight: 'bold', color: '#007AFF' }} numberOfLines={1} ellipsizeMode="tail">{part}</Text>
      ) : (
        <Text key={i} numberOfLines={1} ellipsizeMode="tail">{part}</Text>
      )
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          value={query}
          onChangeText={onChangeText}
          placeholder="Search or select area"
          style={styles.input}
        />
        {loading && <ActivityIndicator size="small" style={styles.activityIndicator} />}
        {query.length > 0 && !loading && suggestions.length === 0 && (
          <TouchableOpacity onPress={() => {
            setQuery('');
            setSuggestions([]);
            onAreaSelect(null, ''); // Clear selected area
          }} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id.toString()}
          style={styles.suggestionsList}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSuggestionPress(item)} style={styles.suggestionItem}>
              {highlightMatch(item.area_name, query)}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  activityIndicator: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    maxHeight: 150,
    marginTop: 2,
    position: 'absolute',
    width: '100%',
    zIndex: 1000, // Ensure it's above other elements
    top: 50, // Adjust based on input height
    flexGrow: 1, // Allow content to grow and enable scrolling
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default AreaSearchBar;