import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Button,
  SafeAreaView,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Calendar, Agenda } from "react-native-calendars";
import axios from "axios";

const authConfig = {
  clientId: "9fcf9072-2400-4380-bab3-7c2953d7605c",
  authority:
    "https://login.microsoftonline.com/e3e2f1c4-a96d-4180-98d0-4d6697f4b7b9",
  tenantId: "e3e2f1c4-a96d-4180-98d0-4d6697f4b7b9",
  redirectUri: "msal9fcf9072-2400-4380-bab3-7c2953d7605c://auth",
  scopes: ["openid", "profile", "offline_access", "Calendars.Read"],
};

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [token, setToken] = useState(null);

  const discovery = AuthSession.useAutoDiscovery(
    `https://login.microsoftonline.com/${authConfig.tenantId}/v2.0`
  );

  const [request, result, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: authConfig.clientId,
      redirectUri: authConfig.redirectUri,
      scopes: authConfig.scopes,
    },
    discovery
  );

  useEffect(() => {
    if (result && result.type === "success") {
      const { code } = result.params;
      AuthSession.exchangeCodeAsync(
        {
          clientId: authConfig.clientId,
          code,
          redirectUri: authConfig.redirectUri,
          extraParams: request.codeVerifier
            ? { code_verifier: request.codeVerifier }
            : undefined,
        },
        discovery
      )
        .then((response) => {
          setToken(response.accessToken);
          fetchEvents(response.accessToken);
        })
        .catch((error) => {
          console.error("Token exchange failed", error);
        });
    }
  }, [result]);

  const fetchEvents = async (accessToken) => {
    console.log("Fetching events with access token:", accessToken);
    try {
      const response = await axios.get(
        "https://graph.microsoft.com/v1.0/me/events",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const events = response.data.value;
      setEvents(events);
      markEventDates(events);
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  };

  const markEventDates = (events) => {
    const dates = {};
    events.forEach((event) => {
      const date = event.start.dateTime.split("T")[0];
      if (dates[date]) {
        dates[date].dots.push({ color: "blue" });
      } else {
        dates[date] = {
          dots: [{ color: "blue" }],
          marked: true,
        };
      }
    });
    setMarkedDates(dates);
  };

  const signOut = () => {
    setUserInfo(null);
    setEvents([]);
    setMarkedDates({});
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button
        disabled={!request}
        title="Sign In with Microsoft"
        onPress={() => promptAsync({ useProxy: true })}
      />
      {token && <Text> {token}</Text>}
      {events.length > 0 && (
        <ScrollView>
          <Calendar markedDates={markedDates} markingType={"multi-dot"} />
          <Agenda
            items={events.reduce((acc, event) => {
              const date = event.start.dateTime.split("T")[0];
              if (!acc[date]) {
                acc[date] = [];
              }
              acc[date].push({
                name: event.subject,
                height: 50,
                description: event.bodyPreview || "",
              });
              return acc;
            }, {})}
            renderItem={(item, firstItemInDay) => (
              <View style={[styles.item, { height: item.height }]}>
                <Text>{item.name}</Text>
                <Text>{item.description}</Text>
              </View>
            )}
            renderEmptyDate={() => (
              <View style={styles.emptyDate}>
                <Text>No events</Text>
              </View>
            )}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: "#f5f5f5",
  },
  item: {
    backgroundColor: "white",
    flex: 1,
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    marginTop: 17,
  },
  emptyDate: {
    height: 15,
    flex: 1,
    paddingTop: 30,
  },
});
