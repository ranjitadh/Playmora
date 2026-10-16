import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { parseAndValidateBridgeMessage, AllowedBridgeMessageType } from './GameBridge';
import { Colors } from '../../theme/colors';

interface PhaserGameViewProps {
  htmlContent: string;
  onMessage: (type: AllowedBridgeMessageType, payload?: any) => void;
}

export const PhaserGameView: React.FC<PhaserGameViewProps> = ({ htmlContent, onMessage }) => {
  const webViewRef = useRef<WebView>(null);

  const handleNativeMessage = (event: WebViewMessageEvent) => {
    const valid = parseAndValidateBridgeMessage(event.nativeEvent.data);
    if (valid) {
      onMessage(valid.type, valid.payload);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleNativeMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        style={styles.webview}
        containerStyle={styles.container}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
