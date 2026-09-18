import { Pressable, StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, action, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>＋</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 46,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E6E2DD',
    backgroundColor: '#FAF8F5',
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151418',
    marginBottom: 16,
  },
  iconText: {
    color: '#E9FF72',
    fontSize: 28,
  },
  title: {
    color: '#151418',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: '#6E6964',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: '#151418',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
