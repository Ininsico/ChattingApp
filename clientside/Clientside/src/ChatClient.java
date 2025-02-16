import java.io.*;
import java.net.*;
import javax.swing.*;
import javax.swing.plaf.basic.BasicScrollBarUI;
import java.awt.*;
import java.awt.event.*;
import java.text.SimpleDateFormat;
import java.util.Date;

public class ChatClient {
    private String username;

    public static void main(String[] args) {
        new ChatClient().startClient();
    }

    public void startClient() {
        try {
            UIManager.setLookAndFeel("javax.swing.plaf.nimbus.NimbusLookAndFeel");
        } catch (Exception e) {
            e.printStackTrace();
        }

        JFrame frame = new JFrame("Client");
        JTextArea chatArea = new JTextArea();
        chatArea.setEditable(false);
        JTextField inputField = new JTextField();
        JButton sendButton = new JButton("Send");
        JButton clearChatButton = new JButton("Clear Chat");
        JToggleButton themeToggle = new JToggleButton("Dark Mode");
        JPanel panel = new JPanel(new BorderLayout());

        // Styling components
        chatArea.setBackground(Color.WHITE);
        chatArea.setForeground(Color.DARK_GRAY);
        inputField.setBackground(Color.LIGHT_GRAY);
        inputField.setForeground(Color.BLACK);
        sendButton.setBackground(Color.BLUE);
        sendButton.setForeground(Color.WHITE);
        clearChatButton.setBackground(Color.RED);
        clearChatButton.setForeground(Color.WHITE);

        // Header Panel
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(Color.DARK_GRAY);

        JLabel headerLabel = new JLabel("Chat Application", JLabel.CENTER);
        headerLabel.setForeground(Color.WHITE);
        headerLabel.setFont(new Font("Arial", Font.BOLD, 18));
        headerPanel.add(headerLabel, BorderLayout.CENTER);
        headerPanel.add(themeToggle, BorderLayout.EAST);

        frame.add(headerPanel, BorderLayout.NORTH);

        // Status Bar
        JLabel statusBar = new JLabel("Connecting to the server...");
        statusBar.setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));
        frame.add(statusBar, BorderLayout.SOUTH);

        // Font Settings
        Font font = new Font("Arial", Font.PLAIN, 14);
        chatArea.setFont(font);
        inputField.setFont(font);
        sendButton.setFont(new Font("Arial", Font.BOLD, 14));
        clearChatButton.setFont(new Font("Arial", Font.BOLD, 14));
        chatArea.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));

        panel.add(inputField, BorderLayout.CENTER);
        panel.add(sendButton, BorderLayout.EAST);
        panel.add(clearChatButton, BorderLayout.WEST);

        frame.setLayout(new BorderLayout());
        frame.add(new JScrollPane(chatArea), BorderLayout.CENTER);
        frame.add(panel, BorderLayout.SOUTH);
        frame.setSize(450, 500);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);

        // Prompt for username
        username = JOptionPane.showInputDialog(frame, "Enter your username:", "Username", JOptionPane.PLAIN_MESSAGE);
        if (username == null || username.trim().isEmpty()) {
            username = "Anonymous";
        }
        chatArea.append("Your username: " + username + "\n");

        // Placeholder Text for Input Field
        inputField.setText("Type your message here...");
        inputField.setForeground(Color.GRAY);
        inputField.addFocusListener(new FocusAdapter() {
            public void focusGained(FocusEvent e) {
                if (inputField.getText().equals("Type your message here...")) {
                    inputField.setText("");
                    inputField.setForeground(Color.BLACK);
                }
            }

            public void focusLost(FocusEvent e) {
                if (inputField.getText().isEmpty()) {
                    inputField.setText("Type your message here...");
                    inputField.setForeground(Color.GRAY);
                }
            }
        });

        // Custom Scrollbar
        JScrollPane scrollPane = new JScrollPane(chatArea);
        scrollPane.getVerticalScrollBar().setUI(new BasicScrollBarUI() {
            @Override
            protected void configureScrollBarColors() {
                this.thumbColor = Color.GRAY;
            }
        });
        frame.add(scrollPane, BorderLayout.CENTER);

        // Theme Toggle Functionality
        themeToggle.addActionListener(e -> {
            if (themeToggle.isSelected()) {
                themeToggle.setText("Light Mode");
                chatArea.setBackground(Color.BLACK);
                chatArea.setForeground(Color.WHITE);
                inputField.setBackground(Color.DARK_GRAY);
                inputField.setForeground(Color.WHITE);
                sendButton.setBackground(Color.DARK_GRAY);
                sendButton.setForeground(Color.WHITE);
                clearChatButton.setBackground(Color.DARK_GRAY);
                clearChatButton.setForeground(Color.WHITE);
                headerPanel.setBackground(Color.BLACK);
                headerLabel.setForeground(Color.WHITE);
                statusBar.setBackground(Color.BLACK);
                statusBar.setForeground(Color.WHITE);
            } else {
                themeToggle.setText("Dark Mode");
                chatArea.setBackground(Color.WHITE);
                chatArea.setForeground(Color.DARK_GRAY);
                inputField.setBackground(Color.LIGHT_GRAY);
                inputField.setForeground(Color.BLACK);
                sendButton.setBackground(Color.BLUE);
                sendButton.setForeground(Color.WHITE);
                clearChatButton.setBackground(Color.RED);
                clearChatButton.setForeground(Color.WHITE);
                headerPanel.setBackground(Color.DARK_GRAY);
                headerLabel.setForeground(Color.WHITE);
                statusBar.setBackground(Color.LIGHT_GRAY);
                statusBar.setForeground(Color.BLACK);
            }
        });

        // Connect to the Server
        new Thread(() -> {
            while (true) {
                try (Socket socket = new Socket("127.0.0.1", 5000)) { // Replace with server IP if needed
                    chatArea.append("Connected to the server!\n");
                    statusBar.setText("Connected to the server");

                    DataInputStream input = new DataInputStream(socket.getInputStream());
                    DataOutputStream output = new DataOutputStream(socket.getOutputStream());

                    // Send Message
                    sendButton.addActionListener((ActionEvent event) -> {
                        try {
                            String message = inputField.getText().trim();
                            if (message.isEmpty() || message.equals("Type your message here...")) return;
                            if (message.length() > 200) {
                                chatArea.append("Message too long! (Max: 200 characters)\n");
                                return;
                            }

                            String timestamp = new SimpleDateFormat("HH:mm:ss").format(new Date());
                            output.writeUTF(username + " [" + timestamp + "]: " + message);
                            chatArea.append("You [" + timestamp + "]: " + message + "\n");
                            inputField.setText("");
                            inputField.requestFocus(); // Refocus on input field
                        } catch (IOException ex) {
                            chatArea.append("Error sending message.\n");
                        }
                    });

                    // Clear Chat
                    clearChatButton.addActionListener((ActionEvent event) -> chatArea.setText(""));

                    // Receive Messages
                    while (true) {
                        String receivedMessage = input.readUTF();
                        chatArea.append(receivedMessage + "\n");

                        // Auto-scroll to bottom
                        chatArea.setCaretPosition(chatArea.getDocument().getLength());
                    }
                } catch (IOException ex) {
                    chatArea.append("Unable to connect to the server. Retrying...\n");
                    statusBar.setText("Retrying connection...");
                    try {
                        Thread.sleep(3000); // Retry after 3 seconds
                    } catch (InterruptedException exc) {
                        exc.printStackTrace();
                    }
                }
            }
        }).start();
    }
}
