import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { debounce } from 'lodash';

export default function AreaSearchBar({ areas, onAreaSelect, selectedAreaName, onChangeText, style }) {
  const [query, setQuery] = useState(selectedAreaName || '');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    setQuery(selectedAreaName || '');
  }, [selectedAreaName]);

  const handleInputChange = (text) => {
    setQuery(text);
    if (onChangeText) {
      onChangeText(text);
    }
  };

  useEffect(() => {
    if (query) {
      const filteredAreas = areas.filter(area =>
        area.area_name.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filteredAreas);
    } else {
      setSuggestions(areas);
    }
    console.log('areas:', areas);
    console.log('query:', query);
    console.log('suggestions:', suggestions);
  }, [query, areas]);

  const handleSelectArea = (area) => {
    setQuery(area.area_name);
    setSuggestions([]);
    onAreaSelect(area.id, area.area_name);
  };

  return (
    <View style={style}>
      <TextInput
        style={styles.input}
        placeholder="Search Area..."
        value={query}
        onChangeText={handleInputChange}
      />
      <FlatList
        style={[styles.suggestionsList, suggestions.length === 0 && { height: 0 }]} // Hide when no suggestions
        data={suggestions}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.suggestionItem}
            onPress={() => handleSelectArea(item)}
          >
            <Text>{item.area_name}</Text>
          </TouchableOpacity>
        )}
        keyboardShouldPersistTaps="always" // Keep keyboard open
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  suggestionsList: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
});
