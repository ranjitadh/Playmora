import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CATEGORIES } from '../games/catalog';
import { Colors } from '../theme/colors';

interface CategoryChipProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      <TouchableOpacity
        style={[styles.chip, selectedCategory === null && styles.activeChip]}
        onPress={() => onSelectCategory(null)}
        activeOpacity={0.7}
        testID="category-chip-all"
        accessibilityRole="button"
        accessibilityLabel="All games"
        accessibilityHint="Shows games from every category"
        accessibilityState={{ selected: selectedCategory === null }}
      >
        <Text
          style={[styles.chipText, selectedCategory === null && styles.activeChipText]}
        >
          All Games
        </Text>
      </TouchableOpacity>

      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              isSelected && {
                backgroundColor: cat.color,
                borderColor: cat.color,
              },
            ]}
            onPress={() => onSelectCategory(cat.id)}
            activeOpacity={0.7}
            testID={`category-chip-${cat.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${cat.name} category`}
            accessibilityHint="Filters the game list to this category"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 8,
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#000',
    fontWeight: '800',
  },
});
