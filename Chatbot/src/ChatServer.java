import java.io.*;
import java.net.*;
import javax.swing.*;
import javax.swing.plaf.basic.BasicScrollBarUI;
import java.awt.*;
import java.awt.event.*;

public class ChatServer {
    private volatile boolean isRunning = true;
    private boolean isDarkMode = true; // Start with dark mode by default

    public static void main(String[] args) {
        new ChatServer().startServer();
    }

    public void startServer() {
        // Set up JFrame
        JFrame frame = new JFrame("Chat Server");
        frame.setSize(500, 600);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLayout(new BorderLayout());

        // Chat area setup
        JTextArea chatArea = new JTextArea();
        chatArea.setEditable(false);
        chatArea.setLineWrap(true);
        chatArea.setWrapStyleWord(true);
        chatArea.setFont(new Font("Arial", Font.PLAIN, 14));
        JScrollPane scrollPane = new JScrollPane(chatArea);
        scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);
        scrollPane.getVerticalScrollBar().setUI(new BasicScrollBarUI() {
            @Override
            protected void configureScrollBarColors() {
                this.thumbColor = Color.GRAY;
            }
        });

        // Input panel setup
        JPanel inputPanel = new JPanel(new BorderLayout());
        JTextField textField = new JTextField("Type your message here...");
        textField.setForeground(Color.GRAY);
        textField.setFont(new Font("Arial", Font.PLAIN, 14));
        JButton sendButton = new JButton("Send");
        sendButton.setBackground(new Color(0, 123, 255));
        sendButton.setForeground(Color.WHITE);
        sendButton.setFocusPainted(false);
        inputPanel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        inputPanel.add(textField, BorderLayout.CENTER);
        inputPanel.add(sendButton, BorderLayout.EAST);

        // Header panel setup
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(new Color(40, 40, 40));
        JLabel headerLabel = new JLabel("Server Chat Application", JLabel.CENTER);
        headerLabel.setForeground(Color.WHITE);
        headerLabel.setFont(new Font("Arial", Font.BOLD, 18));

        JButton themeToggleButton = new JButton("Switch to Light Mode");
        headerPanel.add(headerLabel, BorderLayout.CENTER);
        headerPanel.add(themeToggleButton, BorderLayout.EAST);

        // Add components to frame
        frame.add(headerPanel, BorderLayout.NORTH);
        frame.add(scrollPane, BorderLayout.CENTER);
        frame.add(inputPanel, BorderLayout.SOUTH);
        frame.setVisible(true);

        // Set initial dark mode theme
        applyDarkMode(frame, chatArea, inputPanel, sendButton, themeToggleButton);

        // Add action listener for theme toggle button
        themeToggleButton.addActionListener(e -> {
            isDarkMode = !isDarkMode;
            if (isDarkMode) {
                themeToggleButton.setText("Switch to Light Mode");
                applyDarkMode(frame, chatArea, inputPanel, sendButton, themeToggleButton);
            } else {
                themeToggleButton.setText("Switch to Dark Mode");
                applyLightMode(frame, chatArea, inputPanel, sendButton, themeToggleButton);
            }
        });

        // Handle placeholder text for the text field
        textField.addFocusListener(new FocusAdapter() {
            @Override
            public void focusGained(FocusEvent e) {
                if (textField.getText().equals("Type your message here...")) {
                    textField.setText("");
                    textField.setForeground(Color.BLACK);
                }
            }

            @Override
            public void focusLost(FocusEvent e) {
                if (textField.getText().isEmpty()) {
                    textField.setText("Type your message here...");
                    textField.setForeground(Color.GRAY);
                }
            }
        });

        // Start the server
        try {
            InetAddress localIP = InetAddress.getLocalHost();
            String serverIP = localIP.getHostAddress();
            chatArea.append("Server IP Address: " + serverIP + "\n");

            ServerSocket serverSocket = new ServerSocket(5000);
            chatArea.append("Waiting for a connection...\n");

            Socket socket = serverSocket.accept();
            chatArea.append("Client connected!\n");

            DataInputStream input = new DataInputStream(socket.getInputStream());
            DataOutputStream output = new DataOutputStream(socket.getOutputStream());

            // Send button action listener
            sendButton.addActionListener(e -> {
                try {
                    String message = textField.getText().trim();
                    if (!message.isEmpty() && !message.equals("Type your message here...")) {
                        output.writeUTF("Server: " + message);
                        chatArea.append("You: " + message + "\n");
                        textField.setText("");
                    }
                } catch (IOException ex) {
                    chatArea.append("Error sending message.\n");
                }
            });

            // Thread for receiving messages
            new Thread(() -> {
                try {
                    while (isRunning) {
                        String receivedMessage = input.readUTF();
                        SwingUtilities.invokeLater(() -> chatArea.append(receivedMessage + "\n"));
                    }
                } catch (IOException ex) {
                    SwingUtilities.invokeLater(() -> chatArea.append("Client disconnected.\n"));
                }
            }).start();

        } catch (IOException ex) {
            chatArea.append("Error: " + ex.getMessage() + "\n");
        }
    }

    // Method to apply dark mode theme
    private void applyDarkMode(JFrame frame, JTextArea chatArea, JPanel inputField, JButton sendButton, JButton themeToggleButton) {
        frame.getContentPane().setBackground(Color.DARK_GRAY);
        chatArea.setBackground(Color.BLACK);
        chatArea.setForeground(Color.WHITE);
        inputField.setBackground(Color.GRAY);
        inputField.setForeground(Color.WHITE);
        sendButton.setBackground(Color.DARK_GRAY);
        sendButton.setForeground(Color.WHITE);
        themeToggleButton.setBackground(Color.BLACK);
        themeToggleButton.setForeground(Color.CYAN);
    }

    // Method to apply light mode theme
    private void applyLightMode(JFrame frame, JTextArea chatArea, JPanel inputField, JButton sendButton, JButton themeToggleButton) {
        frame.getContentPane().setBackground(Color.LIGHT_GRAY);
        chatArea.setBackground(Color.WHITE);
        chatArea.setForeground(Color.BLACK);
        inputField.setBackground(Color.WHITE);
        inputField.setForeground(Color.BLACK);
        sendButton.setBackground(Color.LIGHT_GRAY);
        sendButton.setForeground(Color.BLACK);
        themeToggleButton.setBackground(Color.WHITE);
        themeToggleButton.setForeground(Color.BLUE);
    }
}
