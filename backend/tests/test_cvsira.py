"""CvSira Backend API Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://landing-page-ar.preview.emergentagent.com").rstrip("/")

SESSION = requests.Session()
SESSION.headers.update({"Content-Type": "application/json"})


class TestPlans:
    """Plans endpoint tests"""

    def test_get_plans_returns_three(self):
        r = SESSION.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        assert isinstance(plans, list)
        assert len(plans) >= 3
        names = [p["name"] for p in plans]
        assert "Free" in names
        assert "Pro" in names
        assert "Enterprise" in names

    def test_plan_has_required_fields(self):
        r = SESSION.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        for plan in r.json():
            assert "id" in plan
            assert "name" in plan
            assert "points" in plan
            assert "price" in plan


class TestAuth:
    """Auth endpoint tests"""
    _session = requests.Session()
    _session.headers.update({"Content-Type": "application/json"})

    def test_register_new_user(self):
        # Clean up first
        admin_s = requests.Session()
        admin_s.headers.update({"Content-Type": "application/json"})
        admin_s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cvsira.com", "password": "Admin@2025"})
        # Try to delete test user if exists
        users_r = admin_s.get(f"{BASE_URL}/api/admin/users")
        if users_r.ok:
            for u in users_r.json():
                if u["email"] == "test@cvsira.com":
                    admin_s.delete(f"{BASE_URL}/api/admin/users/{u['id']}")

        r = SESSION.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test@cvsira.com",
            "password": "Test@2025"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "test@cvsira.com"
        assert data["role"] == "user"
        assert "id" in data
        assert "password_hash" not in data

    def test_register_duplicate_fails(self):
        r = SESSION.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test@cvsira.com",
            "password": "Test@2025"
        })
        assert r.status_code == 400

    def test_admin_login(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cvsira.com", "password": "Admin@2025"})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert data["email"] == "admin@cvsira.com"
        # Check httpOnly cookie set
        assert "access_token" in r.cookies or "access_token" in s.cookies

    def test_me_authenticated(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cvsira.com", "password": "Admin@2025"})
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "admin@cvsira.com"

    def test_me_unauthenticated(self):
        s = requests.Session()
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_login_wrong_password(self):
        r = SESSION.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cvsira.com", "password": "WrongPass"})
        assert r.status_code == 401

    def test_logout(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cvsira.com", "password": "Admin@2025"})
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # After logout, /me should fail
        r2 = s.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 401


class TestAdmin:
    """Admin endpoint tests"""
    _admin_session = None

    @pytest.fixture(autouse=True)
    def setup_admin(self):
        self.__class__._admin_session = requests.Session()
        self.__class__._admin_session.headers.update({"Content-Type": "application/json"})
        self.__class__._admin_session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cvsira.com", "password": "Admin@2025"})

    def test_admin_stats(self):
        r = self._admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total_users" in data
        assert "total_plans" in data
        assert data["total_plans"] >= 3

    def test_admin_get_users(self):
        r = self._admin_session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_non_admin_cannot_access_admin_stats(self):
        # Login as regular user
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        s.post(f"{BASE_URL}/api/auth/login", json={"email": "test@cvsira.com", "password": "Test@2025"})
        r = s.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 403
