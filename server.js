const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/order.html', function (req, res) {
    res.sendFile(path.join(__dirname, 'order.html'));
});

app.get('/admin.html', function (req, res) {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/messages.html', function (req, res) {
    res.sendFile(path.join(__dirname, 'messages.html'));
});

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), function (error) {
    if (error) {
        console.error('Database connection failed:', error);
    } else {
        console.log('Database connected.');
    }
});

function createTables() {
    db.serialize(function () {
        db.run(
            'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, message TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );

        db.run(
            'CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, package TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, address TEXT NOT NULL, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        );
    });
}

createTables();

app.post('/api/contact', function (req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const message = req.body.message;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: 'Name, email and message are required.'
        });
    }

    const sql = 'INSERT INTO messages(name, email, phone, message) VALUES(?, ?, ?, ?)';

    db.run(sql, [name, email, phone || null, message], function (error) {
        if (error) {
            console.error('Failed to save contact message:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to save message.'
            });
        }

        res.json({
            success: true,
            message: 'Your message has been sent successfully.'
        });
    });
});

app.get('/api/messages', function (req, res) {
    db.all('SELECT * FROM messages ORDER BY id DESC', [], function (error, rows) {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get messages.'
            });
        }

        res.json(rows);
    });
});

app.get('/api/orders', function (req, res) {
    db.all('SELECT * FROM orders ORDER BY id DESC', [], function (error, rows) {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get orders.'
            });
        }

        res.json(rows);
    });
});

app.get('/api/contact-messages', function (req, res) {
    db.all('SELECT * FROM messages ORDER BY id DESC', [], function (error, rows) {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get contact messages.'
            });
        }

        res.json(rows);
    });
});

app.delete('/api/messages/:id', function (req, res) {
    const id = req.params.id;

    db.run('DELETE FROM messages WHERE id = ?', [id], function (error) {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete message.'
            });
        }

        res.json({
            success: true,
            message: 'Message deleted.'
        });
    });
});

app.delete('/api/orders/:id', function (req, res) {
    const id = req.params.id;

    db.run('DELETE FROM orders WHERE id = ?', [id], function (error) {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete order.'
            });
        }

        res.json({
            success: true,
            message: 'Order deleted.'
        });
    });
});

app.delete('/api/contact-messages/:id', function (req, res) {
    const id = req.params.id;

    db.run('DELETE FROM messages WHERE id = ?', [id], function (error) {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete contact message.'
            });
        }

        res.json({
            success: true,
            message: 'Contact message deleted.'
        });
    });
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || 'YOUR_GMAIL@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'YOUR_APP_PASSWORD'
    }
});

app.post('/api/order', function (req, res) {
    const packageName = req.body.package;
    const name = req.body.name;
    const phone = req.body.phone;
    const email = req.body.email;
    const address = req.body.address;
    const message = req.body.message;

    if (!packageName || !name || !phone || !email || !address) {
        return res.status(400).json({
            success: false,
            message: 'Please fill in all required fields.'
        });
    }

    const sql = 'INSERT INTO orders (package, name, phone, email, address, message) VALUES(?, ?, ?, ?, ?, ?)';

    db.run(sql, [packageName, name, phone, email, address, message || ''], async function (error) {
        if (error) {
            console.error('Failed to save order:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to save your order.'
            });
        }

        try {
            const canSendEmail = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER !== 'YOUR_GMAIL@gmail.com';

            if (canSendEmail) {
                const emailHtml = [
                    '<h2>New Internet Package Order</h2>',
                    '<p><strong>Package:</strong> ' + packageName + '</p>',
                    '<p><strong>Name:</strong> ' + name + '</p>',
                    '<p><strong>Phone:</strong> ' + phone + '</p>',
                    '<p><strong>Email:</strong> ' + email + '</p>',
                    '<p><strong>Address:</strong> ' + address + '</p>',
                    '<p><strong>Message:</strong> ' + (message || 'No additional message') + '</p>',
                    '<p><strong>Order ID:</strong> ' + this.lastID + '</p>'
                ].join('');

                await transporter.sendMail({
                    from: process.env.GMAIL_USER,
                    to: process.env.GMAIL_TO || 'mahfujkhanhridoy@gmail.com',
                    subject: 'New Package Order - ' + packageName,
                    html: emailHtml
                });
            }

            res.json({
                success: true,
                message: 'Your order has been submitted successfully!'
            });
        } catch (emailError) {
            console.error('Email send failed:', emailError);
            res.json({
                success: true,
                message: 'Order saved successfully, but email could not be sent.'
            });
        }
    });
});

app.listen(PORT, function () {
    console.log('Server running at http://localhost:' + PORT);
});
