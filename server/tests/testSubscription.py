import unittest
from server.subscription import Channel


class TestChannel(unittest.TestCase):
    """docstring for TestSubscription"""
    def setUp(self):
        self.ch = Channel()

    def tearDown(self):
        self.ch = None

    def testNewChannelIsDead(self):
        self.assertTrue(self.ch.is_dead())

    def testOneUserInChannelNotDead(self):
        self.ch.user_in('usr1')
        self.assertFalse(self.ch.is_dead())

    def testUserInAndSameUserOutChannelDead(self):
        self.ch.user_in('usr2')
        self.ch.user_out('usr2')
        self.assertTrue(self.ch.is_dead())

    def testUserInMultipleTimesSameUserOutChannelDead(self):
        self.ch.user_in('usr3')
        self.ch.user_in('usr3')
        self.ch.user_out('usr3')
        self.assertTrue(self.ch.is_dead())

    def testOnlyUserOutMultipleTimesChannelDead(self):
        self.ch.user_out('usr4')
        self.assertTrue(self.ch.is_dead())


if __name__ == '__main__':
    unittest.main()
