-- Create schema for shift roster
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    job_title VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('Morning', 'Normal', 'Noon', 'Extra Day', '-')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Office', 'Home', 'Leave')),
    UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);

-- Seed employees from OrgTree
INSERT INTO employees (name, job_title) VALUES
    ('Jigar Panchal', 'Senior Customer Experience Engineer'),
    ('Dhyan Dave', 'Senior Customer Experience Engineer'),
    ('Mayurkumar Vyas', 'Customer Experience L3'),
    ('Hareshkumar Patel', 'Customer Experience L3 Lead'),
    ('Rushabh Patel', 'Customer Experience L3'),
    ('Stuti Ahluwalia', 'Customer Experience Engineer'),
    ('Anil Chauhan', 'Senior Customer Experience Engineer'),
    ('Parth Parekh', 'Customer Experience Engineer'),
    ('Dhruv Panpalia', 'Associate Customer Experience Engineer'),
    ('Vishal Sen', 'Associate Customer Experience Engineer'),
    ('Sujal Shukla', 'Associate Customer Experience Engineer'),
    ('Jainam Patel', 'Trainee Customer Experience Engineer'),
    ('Muhammad Arsh Kazi', 'Trainee Solution Engineer'),
    ('Rizvan Mansuri', 'Senior Customer Experience Engineer'),
    ('Jainam Shah', 'Associate Customer Experience Engineer'),
    ('Khushbu Vaniya', 'Customer Experience Engineer'),
    ('Neha Raje', 'Associate Customer Experience Engineer'),
    ('Misha Kotadiya', 'Associate Customer Experience Engineer'),
    ('Mitwa Bharti', 'Customer Experience Engineer'),
    ('Arjun Chaudhary', 'Associate Customer Experience Engineer')
ON CONFLICT (name) DO NOTHING;
